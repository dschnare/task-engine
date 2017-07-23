# Task Engine

Task Engine is a Promise-based, no frills task runner.

## Install

    npm install task-engine -D

## Quick Start

    // taskfile.js
    const TaskEngine = require('taskengine')

    module.exports = new TaskEngine()
      .t(function build () {}, [ 'buildScripts', 'buildStyles' ])
      .t(function buildScripts (options) {
        // Build your scripts (do something with options.minify)
        return new Promise((resolve, reject) => setTimeout(resolve, 2000))
      })
      .t(function buildStyles (options) {
        // Build your styles (do something with options.minify)
        return new Promise((resolve, reject) => setTimeout(resolve, 2000))
      })

    // at the command line
    taskengine build --minify

## CLI

    Usage: taskengine [task name] [options or @moduleId]

    Loads the module taskengine.js from the current directory. This module must
    export an instance of a TaskEngine as its default export.

    Any options specified will have all leading '-' characters removed and will
    be set as options when running tasks. Option values will be converted to
    null, boolean or numbers if the value can be converted.

    Any option value that starts with '@' is interpreted as a module ID. This
    will cause the module designated by the module ID to be loaded and its
    default export will become the option's value.

    Alternatively, if the options argument is a string starting with '@' it is
    interprted as a module ID. This will cause the module designated by the
    module ID to be loaded and its default export will become the options.

    Any module ID designated by the '@' prefix is loaded relative to the current
    working directory if and only if the module ID is relative (i.e. starts with
    '.'), otherwise it's treated as a top-level module ID.

Example:

    taskengine myTask --minfy --folders one two --num 45 --folders lib

This example will run the task `myTask` and all of its dependent tasks passing
the following options to each task:

    {
      minify: true,
      folders: [ 'one', 'two', 'lib' ],
      num: 45
    }

Example:

    taskengine :myTask

This example will run the task `myTask` without running any of its dependent
tasks with no custom options passed to the task.

## API

**TaskEngine()**

Constructs a new instance of a TaskEngine.

Example:

    const tEngine = new TaskEngine()

**TaskEngine#addTask(task, taskName, dependencies)**

Adds a task and associates its dependencies. If a task has already been
added with the specified name it will be replaced. Returns this.

Dependencies, if specified, is an array of task names or `{ task, options }`
where `task` is a task name and `options` are specific options to pass to this
dependent task.

Overloads:

    addTask(task, taskName, dependencies)
    addTask(task, taskName)
    addTask(task, dependencies)
    addTask(task)

A task is a function that has the following signature

    task (options, engine, results): any | Promise<any>

Where `options` is the options passed to the task from the command line, or
from a dependency list, `engine` is an instance of the TaskEngine and `results`
is an array of results from each of this task's dependencies (if any).

Example:

    const tEngine = new TaskEngine()
    tEngine.addTask(
      function myTask () { },
      [ { task: 'otherTask', options: { ...options.. } } ]
    )
    tEngine.addTask(() => { }, 'otherTask', [ 'otherTask2' ])
    tEngine.addTask(function otherTask2 () {})

**TaskEngine#addTasksFromObject(object)**

Adds all methods on the specified object as tasks using the key name as the
task name. If the task function has the property `dependencies` and it's an
array then it will be treated as the task's dependencies. If the task
function has the property `taskName` then it will be used as the task's name.
Returns this.

Example:

    const tEngine = new TaskEngine()
    tEngine.addTasksFromObject({
      anotherTask () {
        // do task
      },
      myTask: Object.assign(() => {
        // do task
      }, { dependencies: [ 'anotherTask' ] })
    })

**TaskEngine#t(object | task, taskName, dependencies)**

Adds a task or tasks and associates dependencies. This is an alias for
`addTask` and `addTasksFromObject`. Returns this.

Overloads:

    t(task, taskName, dependencies)
    t(task, taskName)
    t(task, dependencies)
    t(task)
    t({ ...tasks... })

Example:

    const tEngine = new TaskEngine()
    tEngine.t(function myTask () {
      // do task
    }, [ 'otherTask' ])
    // To add tasks from an object (equivalent to the statment above)
    tEngine.t({
      myTask: Object.assign(() {
        // do task
      }, { dependencies: [ 'otherTask' ] })
    })
    // Or using the TaskEngine.task decorator
    tEngine.t([
      TaskEngine.task([ 'otherTask' ], () => {
        // do task
      })
    ])

**TaskEngine#runTask(taskName, options = {})**

Attempts to run a task by name. If the task was added with dependencies then
those dependent tasks are run first sequentially. Returns a promise that
resolves to the result of the task.

The options are passed down to each dependent task and the tas designated by
`taskName`.

Example:

    const tEngine = new TaskEngine()
    tEngine
      .t(function build (options) {
        return Promise.resolve(42)
      })
      .runTask('build', { minify: true })
      .then(result => console.log('build completed', result))
      .catch(error => console.error(error))

**TaskEngine#runTaskWithoutDependencies(taskName, options = {})**

Attempts to run a task by name without running its dependent tasks.

The options are passed down to each dependent task and the tas designated by
`taskName`.

Example:

    const tEngine = new TaskEngine()
    tEngine
      .t(function build (options, engine, results) {
        // do build task
        // normally results would be [ 42 ], but build is ran without
        // dependencies then results will be []
      }, [ 'otherTask' ])
      .t(function otherTask () {
        return 42
      })
      .runTaskWithoutDependencies('build')
      .then(() => console.log('build is done'))
      .catch(error = console.error(error))

**TaskEngine#getTaskNames()**

Retrieves all the registered task names.

    const tEngine = new TaskEngine()
    tEngine.t(function build () {})
    tEngine.getTaskNames() // [ 'build' ]

**TaskEngine#canRunTask(taskName)**

Determines if a task can run.

    const tEngine = new TaskEngine()
    tEngine.t(function build () {})
    tEngine.canRunTask('build') // true
    tEngine.canRunTask('otherTask') // false

**TaskEngine.getInstance()**

Retrieves the singleton instance of the TaskEngine. This is a conveinece if a
singleton is every needed.

Example:

    const tEngine = TaskEngine.getInstance()

**TaskEngine.task(taskName, dependencies, task)**

A convenient task function decorator factory that makes it a bit easier to
specify dependencies and/or a task's name for tasks added from an object or
array.

Overloads:

    task(taskName, dependencies, task)
    task(taskName, task)
    task(task)
    task(taskName, dependencies)
    task(taskName)
    task()

Example:

    const tEngine = new TaskEngine()
    tEngine.addTasksFromObject([
      TaskEngine.task(
        [ 'otherTask' ],
        () => {
          // do task
        }
      )
    ])

Example with ES2016 decorator support (currently needs transpiler):

    const task = TaskEngine.task
    const tEngine = new TaskEngine()
    tEngine.addTasksFromObject({
      // Give a new name to the task at the same time as
      // specifying dependencies
      @task('myNewTask', [ 'otherTask' ])
      myTask () {
        // do task
      }
    })
