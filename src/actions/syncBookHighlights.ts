
import * as kc from '@hadynz/kindle-clippings';
import { IBatchBlock, ILSPluginUser } from '@logseq/libs/dist/LSPlugin.user';
import { goToPage } from '../utils/goToPage';
import hash from 'hash.js';
import { EntryType } from '@hadynz/kindle-clippings/dist/blocks/ParsedBlock';
import { renderTemplate } from '../utils/renderTemplate';
import { createZettelId } from '../utils/zettelId';
import * as Sentry from '@sentry/react';

export const createBookPageProperties = (title: string, book: kc.Book) => `title:: [[${title}]]
alias:: ${book.title.replaceAll('/', '_').split(':')[0]}
author:: "${book.author}"
last_sync:: ${new Date().toISOString()}
type:: Book`;

export const syncBookHighlights = async (book: kc.Book, logseq: ILSPluginUser) => {
  console.info(`Importing from ${book.title}`);
  const transaction = Sentry.getCurrentHub()?.getScope()?.getTransaction();
  const span = transaction?.startChild({
    op: "syncBookHighlights",
    description: "Import highlights from Kindle My Clippings file",
    data: {
      highlights: book.annotations.length,
      source: 'kindle_clippings',
      'is_new': true
    }
  });

  try {
    const zettel = createZettelId();
    let path = logseq.settings?.highlight_path ?? `highlights/{type}/{title}`;
    path = renderTemplate(path, {
      type: 'book',
      title: book.title,
      zettel,
    });

    console.info(`Loading path ${path}`);
    await goToPage(path, logseq);
    
    const page = await logseq.Editor.getCurrentPage();
    const pageBlocksTree = await logseq.Editor.getCurrentPageBlocksTree()
    
    let targetBlock = pageBlocksTree[0]!;
    
    if (!pageBlocksTree.length) {
      console.info(`Creating new page block`);
      // @ts-ignore
      targetBlock = await logseq.Editor.insertBlock(page?.name, createBookPageProperties(path, book), { isPageBlock: true });
    } else {
      console.info('SKIP: Updating page block');
      span?.setData('is_new', false);
      // await logseq.Editor.updateBlock(targetBlock.uuid, createBookPageProperties(path, book))
    }

    

    function addContentBlock(content: string, type: EntryType, start?: number, page?: string) {
      const highlight_id = hash.sha224().update([type, start, content].filter(Boolean).join(':')).digest('hex');
      const icon = type === 'HIGHLIGHT' ? '📌' : type === 'NOTE' ? '📝' : type === 'BOOKMARK' ? '🎯' : '❓';

      const properties: Record<string, unknown> = { highlight_id };

      if (page) {
        properties.page = page;
      }

      return {
        content: `${icon} ${content}`,
        properties,
      } as IBatchBlock;
    }

    let blocks = book.annotations.sort((a, b) => (a.page?.from ?? 0) - (b.page?.from ?? 0)).reduce((updates, annotation) => {
      const content = annotation.content;
      const type = annotation.type;
      const start = annotation.location?.from;
      const page = annotation.page?.display;

      updates.push(addContentBlock(content, type, start, page));

      if (annotation.note) {
        updates.push(addContentBlock(annotation.note, 'NOTE', start, page));
      }

      return updates;
    }, [] as Array<IBatchBlock>);

    console.info(`Created ${blocks.length} blocks`);

    for (const block of pageBlocksTree) {
      blocks = blocks.filter((b) => b.properties?.highlight_id !== block.properties?.highlightId);
    }

    console.info(`Filtered block count: ${blocks.length}`);

    if (blocks.length) {
      await logseq.Editor.insertBatchBlock(targetBlock.uuid, blocks, {
        sibling: true
      });
    }

    span?.setStatus('ok');
    console.info(`Done importing ${book.title}`);
  } catch (ex) {
    console.error(`Error importing ${book.title}`, ex);
    Sentry.captureException(ex);
    // @ts-ignore
    logseq.App.showMsg(ex.toString(), 'warning');
    span?.setStatus('unknown_error');
  } finally {
    span?.finish();
  }
}