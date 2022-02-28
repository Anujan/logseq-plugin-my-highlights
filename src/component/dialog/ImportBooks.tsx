import React from 'react';
import * as kc from '@hadynz/kindle-clippings';
import { BasicDialog, DialogAction, DialogActions, DialogHeader } from './Basic';
import { syncBookHighlights } from '../../actions/syncBookHighlights';

interface ImportBooksDialogProps {
  books: Array<kc.Book>;
  show?: boolean;
  onClose: () => void;
}

export const ImportBooksDialog: React.FC<ImportBooksDialogProps> = ({ books, show, onClose }) => {
  const [selectedBooks, setSelectedBooks] = React.useState<Array<string>>([]);

  const onImportBooks = async () => {
    console.info('TODO: Import books', selectedBooks);
    const firstBook = books.find(({ title }) => title === selectedBooks[0]);

    if (firstBook) {
      await syncBookHighlights(firstBook, window.logseq);
    }

    onClose();
  };

  const onBookSelected = (title: string): React.ChangeEventHandler<HTMLInputElement> => (event) => {
    if (event.target.checked && !selectedBooks.includes(title)) {
      setSelectedBooks([
        ...selectedBooks,
        title,
      ]);
    } else if (!event.target.checked && selectedBooks.includes(title)) {
      setSelectedBooks(selectedBooks.filter(t => t !== title));
    }
  }
  
  if (show) {
    return <BasicDialog onClose={onClose}>
      <DialogHeader title='Import Book Highlights' />
      <div className="p-4 scroll-auto h-96 overflow-y-auto flex flex-col gap-1">
        {books.map((book) => <div className='border rounded flex items-center gap-1 px-2' key={book.title}>
          <input type='checkbox' checked={selectedBooks.includes(book.title)} onChange={onBookSelected(book.title)} />
          <div className="truncate text-lg grow">{book.title}</div>
        </div>)}
      </div>
      <DialogActions>
        <DialogAction label='Import' onClick={onImportBooks} />
      </DialogActions>
    </BasicDialog>;
  }

  return null;
}