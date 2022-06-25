#!/usr/bin/env node

const path = require('path')
const minimist = require('minimist')
const shortid = require('shortid')
import { uniq } from 'lodash-es'
import { trim } from 'lodash-es'
const slugify = require('@lukepeavey/slugify')
const { writeJSONFiles } = require('../../lib/writeJSONFiles')
const { parseDataFiles } = require('../../lib/parseDataFiles')
const { log } = require('../../lib/log')
const { parseFile } = require('../../lib/parseFile')
const { run } = require('../../lib/run')
const { validateInput } = require('./validation')
const { dataDir } = require('../../config')
const { logResults } = require('./logResults')

/**
 * Parses the CLI arguments
 */
function parseArgs() {
  const args = minimist(process.argv.slice(2))
  const VERBOSE = args.v || args.verbose
  const DRY_RUN = args.d || args.dryRun
  const DATA_DIR = path.resolve(args.dataDir || dataDir.source)
  const INPUT_FILE = path.resolve('input', args._[0] || 'tags.json')
  const NAME = args.name || args.n
  return { DATA_DIR, INPUT_FILE, DRY_RUN, NAME, VERBOSE }
}

/**
 * Parses the value of the `--name` argument
 *
 * @param {string} name a comma separated list of tag names
 * @return {{ name: string }[]}
 */
function parseNameInput(NAME) {
  if (!NAME) return null
  return NAME.split(',').map(name => ({ name: trim(name) }))
}

run(async () => {
  const { DATA_DIR, INPUT_FILE, VERBOSE, DRY_RUN, NAME } = parseArgs()
  // The current database collections
  const db = parseDataFiles(DATA_DIR)

  // Get the input data (from the `--name` argument or an input file)
  const inputData = parseNameInput(NAME) || parseFile(INPUT_FILE)

  // Validate input data
  if (!validateInput(inputData)) {
    validateInput.errors.forEach(error => log.error(error))
    throw new Error('Input data does not match schema')
  }

  // Create an array of new tag names that will be created
  const tagNames = inputData.filter(({ name }) => {
    return !db.tags.find(tag => slugify(name) === slugify(tag.name))
  })

  // Map the new tag names to an array of `Tag` objects
  const tags = uniq(tagNames).map(({ name }) => ({
    _id: shortid(),
    name: slugify(name),
  }))

  if (tags.length && !DRY_RUN) {
    // Add the new tags to the existing collection, then write files to disk
    writeJSONFiles(DATA_DIR, { tags: [...db.tags, ...tags] })
  }
  // Output the results to the console
  logResults(inputData, tags, VERBOSE, DRY_RUN)
})
