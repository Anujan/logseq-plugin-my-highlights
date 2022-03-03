const fs = require('fs');
const path = require('path');

const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const SENTRY_DSN = process.env.SENTRY_DSN;

fs.writeFileSync(path.resolve(process.cwd(), '.env'), `
SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
SENTRY_ORG=${SENTRY_ORG}
SENTRY_PROJECT=${SENTRY_PROJECT}
SENTRY_DSN=${SENTRY_DSN}
SENTRY_LOG_LEVEL=info`, 'utf-8');

module.exports = {
  branches: ["master"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
      },
    ],
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    "@semantic-release/git",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          `./createRelease.sh ${nextRelease.version}`,
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: "logseq-plugin-my-highlights-*.zip",
      },
    ],
  ],
};
