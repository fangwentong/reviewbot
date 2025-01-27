import * as dotenv from 'dotenv'
import createSuggestions from './createSuggestions/index.js'
import getOctokit from './oktokit/index.js'

dotenv.config()
/**
 * Event listener function that is invoked when a new message is received.
 * @param {import('@google-cloud/pubsub').Message} message - The message object.
 * @return {void}
 */
export default async function app(message) {
  console.log('[reviewbot] - createReview', message.data)
  const messageContext = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  )
  await doReview(messageContext)
}

export async function doReview(messageContext) {
  console.log('[reviewbot] - creating suggestions', messageContext)
  const filesWithSuggestions = await createSuggestions(messageContext)

  const comments = filesWithSuggestions.map(f => ({
    path: f.filename,
    line: f.lineRange.end,
    start_line:
      f.lineRange.start < f.lineRange.end ? f.lineRange.start : undefined,
    /*
    position: findLinePositionInDiff(
      messageContext.diff,
      f.filename,
      f.lineRange.start
    ),
    */
    body: f.suggestions
  }))

  console.log('filesWithSuggestions', filesWithSuggestions)
  console.log(
    `[reviewbot] - creating review for commit ${messageContext.latestCommit}`
  )

  const octokit = await getOctokit(messageContext.installationId)

  await octokit.rest.pulls.createReview({
    repo: messageContext.repo,
    owner: messageContext.owner,
    pull_number: messageContext.pull_number,
    commit_id: messageContext.latestCommit,
    body: 'Please take a look at my comments.',
    event: 'COMMENT',
    comments
  })

  console.log('[reviewbot] - review finished')
}
