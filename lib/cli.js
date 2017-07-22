#!/usr/bin/env node
const path = require('path')
const tEngine = require(path.resolve('taskfile.js'))

// Helper Functions

function loadModule (moduleId) {
  return moduleId[0] === '.'
    ? require(path.resolve(moduleId))
    : require(moduleId)
}

function convert (o) {
  o = JSON.parse(JSON.stringify(o))

  Object.keys(o).forEach(k => {
    const value = o[k]
    // string
    if (typeof value === 'string') {
      switch (value) {
        case 'null':
        case 'Null':
          o[k] = null
          break
        case 'true':
        case 'True':
          o[k] = true
          break
        case 'false':
        case 'False':
          o[k] = false
          break
        default:
          if (/^-?(\d+|(\d*\.\d+))([eE][+\-]?\d+)?$/.test(value)) {
            o[k] = parseFloat(value)
          } else if (value[0] === '@') {
            o[k] = loadModule(value.substr(1))
          } else {
            o[k] = value
          }
      }
    // Array
    } else if (Array.isArray(value)) {
      return value.map(v => convert(v))
    // Object
    } else {
      return o[k] = convert(value)
    }
  })

  return o
}

function readOptionsFromCommandLine (args) {
  let options = args
    .filter(a => a[0] === '-' && a.indexOf('=') > 0)
    .reduce((options, arg) => {
      let [ prop, value ] = arg.split('=').map(s => s.trim())
      prop = prop.replace(/^-+/, '')
      return Object.assign(options, { [prop]: value })
    }, {})

  args = args.filter(a => a.indexOf('=') < 0)
  let g = 0

  while (g < args.length) {
    const a = args[g].replace(/^-+/, '')
    if (!args[g + 1] || args[g + 1][0] === '-') {
      options[a] = true
      g += 1
    } else {
      const list = []
      g += 1
      while (args[g] && args[g][0] !== '-') {
        list.push(args[g])
        g += 1
      }
      if (a in options && options[a] !== true) {
        options[a] = options[a].concat(list)
      } else {
        options[a] = list.length === 1 ? list[0] : list
      }
    }
  }

  return convert(options)
}

// Entry Point

let args = process.argv.slice(2)
const taskName = (args[0] || 'default').replace(/^:/g, '')
const noDeps = args([0] || '')[0] === ':'
const optionsModuleId = args[1] || ''
let options = {}

if (optionsModuleId && optionsModuleId[0] !== '-') {
  options = loadModule(optionsModuleId)
} else {
  options = readOptionsFromCommandLine(args)
}

const t = Date.now()
const p = noDeps
  ? tEngine.runTaskWithoutDependencies(taskName, options)
  : tEngine.runTask(taskName, options)

p.then(() => {
  const duration = ((Date.now() - t) / 1000).toFixed(2)
  console.log('Task', `'${taskName}'`, 'completed in', duration, 'seconds')
})
.catch(error => console.error(error))
