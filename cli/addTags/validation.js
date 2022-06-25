const { ajv } = require('../../lib/ajv')

// Schema for the input data
const validateInput = ajv.compile({
  title: 'addTags input',
  type: 'array',
  items: {
    type: 'object',
    properties: { name: { type: 'string' } },
    required: ['name'],
    additionalProperties: false,
  },
})

export { validateInput }
