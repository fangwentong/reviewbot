/**
 * Finds the position of a specific line in a git diff output.
 * The line position refers to the index of the line in the diff, considering only the lines within the file specified.
 *
 * https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28#create-a-review-for-a-pull-request
 *
 * The position value equals the number of lines down from the first "@@" hunk header in the file you want to
 * add a comment. The line just below the "@@" line is position 1, the next line is position 2, and so on.
 * The position in the diff continues to increase through lines of whitespace and additional hunks until
 * the beginning of a new file.
 *
 * @param {string} diff - The git diff output as a string.
 * @param {string} filename - The name of the file to search for the line number.
 * @param {number} lineNumber - The line number to find in the specified file.
 * @returns {number} The position of the specified line in the diff, or -1 if not found.
 */
const findLinePositionInDiff = (diff, filename, lineNumber) => {
  if (!diff) {
    return -1
  }
  const lines = diff.split('\n')
  let position = 0
  let currentFile = null
  let currentLineInFile = 0
  let inHunk = false

  for (const line of lines) {
    if (line.startsWith('diff')) {
      currentFile = null
      inHunk = false
    } else if (line.startsWith('+++')) {
      currentFile = line.slice(6) // Remove "+++ b/"
      currentLineInFile = 0
    } else if (line.startsWith('@@')) {
      const hunkMatch = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunkMatch) {
        currentLineInFile = parseInt(hunkMatch[1]) - 1
        inHunk = true
      } else {
        inHunk = false
      }
    } else if (currentFile === filename && inHunk) {
      if (line.startsWith(' ') || line.startsWith('+')) {
        currentLineInFile++

        if (currentLineInFile === lineNumber) {
          return position
        }

        position++
      } else if (line.startsWith('-')) {
        position++
      }
    }
  }

  return -1
}

export { findLinePositionInDiff }
