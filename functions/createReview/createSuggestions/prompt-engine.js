import path from 'node:path'

/* eslint-disable */
function filterOnlyModified(files) {
  return files.map(file => ({
    ...file, modifiedLines: file.modifiedLines.filter(line => line.added)
  }));
}

const fileTypes = {
  '.js': 'javascript',
  '.ts': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.m': 'objective-c',
  '.mm': 'objective-c',
  '.swift': 'swift',
  '.proto': 'protobuf',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.sh': 'shell'
};

/* eslint-enable */

function filterAcceptedFiles(files) {
  return files
    .filter(f => path.extname(f.afterName) in fileTypes)
    .filter(f => f.modifiedLines.length > 0)
}

function groupByLineRange({ rawDiff, modifiedLines }) {
  const output = []
  let range = { start: 0, end: 0 }
  let diff = ''
  for (const element of modifiedLines) {
    const { lineNumber } = element
    if (range.start === 0 && (element.added || element.deleted)) {
      range.start = lineNumber
      range.end = lineNumber
    } else if (lineNumber === range.end + 1) {
      range.end = lineNumber
    }
    diff += formatLine(element)
  }
  output.push({ range, diff, rawDiff: rawDiff })
  return output
}

function formatLine(line) {
  if (line.added) {
    return `+${line.line}\n`
  } else if (line.deleted) {
    return `-${line.line}\n`
  } else {
    return ` ${line.line}\n`
  }
}

/**
 * build prompt for a code review, based on the Google Eng Practices:
 * https://google.github.io/eng-practices/review/
 *
 * @param fileType
 * @param change
 * @returns {[{role: string, content: string}]}
 */
function enhanceWithPromptContext(fileType, change) {
  const promptContext = `
Act as a code reviewer of a Pull Request, providing feedback on the code changes below. Do not introduce yourselves.
As a code reviewer, your task is:
- Review the code changes (diffs) in the patch and provide feedback, including:
  - Design: Is the code well-designed and appropriate for your system?
  - Functionality: Does the code behave as the author likely intended? Is the way the code behaves good for its users?
  - Complexity: Could the code be made simpler? Would another developer be able to easily understand and use this code when they come across it in the future?
  - Naming: Did the developer choose clear names for variables, classes, methods, etc.?
  - Documentation: Did the developer also update relevant documentation?
- If there are any bugs, highlight them.
- Do not highlight minor issues and nitpicks.
- Use numbered lists if you have multiple comments.
- Be as concise as possible
- Assume positive intent

You are provided with the code changes in a unidiff format, The language of the code is ${fileType}. 
Patch of the code change to review:

${change}
`
  console.log('[reviewbot] - building prompt context', promptContext)
  return [
    // {role: 'system', content: `You are a senior software engineer and an emphathetic code reviewer.`},
    // {role: 'user', content: promptContext},
    { role: 'system', content: promptContext }
  ]
}

function getFileType(file) {
  return fileTypes[path.extname(file)]
}

/**
 Builds prompts for each file in a given payload by filtering and grouping only modified lines.
 @param {Object} messageContext - The payload containing the files to build prompts for.
 @returns {Object[]} - An array of objects containing file names and an array of changes with prompts for each file.
 **/
function buildPrompt(messageContext) {
  const payload = messageContext.files
  const acceptedFiles = filterAcceptedFiles(payload)
  // const filesWithModifiedLines = filterOnlyModified(acceptedFiles)
  const result = acceptedFiles.map(file => {
    return {
      fileName: file.afterName,
      changes: groupByLineRange(file).map(change => ({
        ...change,
        prompt: enhanceWithPromptContext(
          getFileType(file.afterName),
          change.rawDiff
        )
      }))
    }
  })
  console.log('[reviewbot] - building prompts', result)
  return result
}

export default buildPrompt
