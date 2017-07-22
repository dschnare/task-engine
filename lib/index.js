class TaskEngine {
  constructor () {
    this.tasks = Object.create(null)
  }

  /**
   * Adds a task and associates its dependencies. If a task has already been
   * added with the specified name it will be replaced.
   *
   * Overload:
   * TaskEngine#addTask(task, taskName, dependencies)
   * TaskEngine#addTask(task, taskName)
   * TaskEngine#addTask(task, dependencies)
   * TaskEngine#addTask(task)
   *
   * Example:
   * // These two statements do the same thing, and result with a task named
   * // 'myTask' being registered with a dependency on the 'otherTask'.
   * tEngine.addTask(function myTask () {}, [ 'otherTask' ])
   * tEngine.addTask(function () {}, 'myTask', [ 'otherTask' ])
   *
   * @param {{(options:Object, tasks:TaskEngine, results:any[]): Promise<void>}} task The task function
   * @param {string} [taskName] The name to give the task
   * @param {string[] | {task:string, options?:Object}[]} [dependencies] The task dependencies
   * @return {TaskEngine}
   */
  addTask (task, taskName, dependencies = []) {
    if (Array.isArray(taskName)) {
      dependencies = taskName
      taskName = task.name
    }

    if (!taskName) {
      taskName = task.name
    }

    if (typeof task === 'function') {
      if (taskName) {
        this.tasks[taskName] = { run: task, dependencies }
        return this
      } else {
        throw new Error(
          'Task function must be a named function or ' +
          'an explicit task name must be passed in'
        )
      }
    } else {
      throw new Error('Task must be a function')
    }
  }

  /**
   * Adds all methods on the specified object as tasks using the key name as the
   * task name. If the task function has the property `dependencies` and it's an
   * array then it will be treated as the task's dependencies. If the task
   * function has the property `taskName` then it will be used as the task's
   * name.
   *
   * Example:
   * tEngine.addTasksFromObject({
   *  myTask: Object.assign(() => {
   *    // do task
   *  }, { dependencies: [ 'anotherTask' ] })
   * })
   *
   * @param {any} object The object containing the task functions to add
   * @return {TaskEngine}
   */
  addTasksFromObject (object) {
    Object.keys(object).forEach(key => {
      const task = object[key]
      if (typeof task === 'function') {
        const taskName = task.taskName || key
        const deps = Array.isArray(task.dependencies) ? task.dependencies : []
        this.addTask(task, taskName, deps)
      }
    })
    return this
  }

  /**
   * Adds a task or tasks and associates dependencies. This is an alias for
   * #addTask and #addTasksFromObject.
   *
   * Overload:
   * TaskEngine#t(task, taskName, dependencies)
   * TaskEngine#t(task, taskName)
   * TaskEngine#t(task, dependencies)
   * TaskEngine#t(task)
   * TaskEngine#t({ ...tasks... })
   *
   * Example:
   * // To add tasks individually
   * tEngine.t(function myTask () {
   *  // do task
   * }, [ 'otherTask' ])
   * // To add tasks from an object (equivalent to the statment above)
   * tEngine.t({
   *    myTask: Object.assign(() {
   *      // do task
   *    }, { dependencies: [ 'otherTask' ] })
   * })
   * // Or using the TaskEngine.task decorator
   * tEngine.t({
   *  myTask: TaskEngine.task([ 'otherTask' ], () => {
   *    // do task
   *  })
   * })
   *
   * @param {{[key:string]: any} | {(options:Object, tasks:TaskEngine, results:any[]): Promise<void>}} task The task function or object containing task functions
   * @param {string} [taskName] The name to give the task
   * @param {string[] | {task:string, options?:Object}[]} [dependencies] The task dependencies
   * @return {TaskEngine}
   * @see TaskEngine#addTask
   * @see TaskEngine#addTasksFromObject
   */
  t (task, taskName, dependencies = []) {
    if (arguments.length === 1 && Object(task) === task && typeof task === 'object') {
      return this.addTasksFromObject(task)
    } else {
      return this.addTask(task, taskName, dependencies)
    }
  }

  /**
   * Retrieves all the registered task names.
   *
   * @return {string[]} Task names
   */
  getTaskNames () {
    return Object.keys(this.tasks)
  }

  /**
   * Determines if a task can run.
   *
   * @param {string} taskName The task name to test
   * @return {boolean}
   */
  canRunTask (taskName) {
    return taskName in this.tasks
  }

  /**
   * Attempts to run a task by name. If the task was added with dependencies
   * then those dependent tasks are run first sequentially.
   *
   * @param {string} taskName The name of the task to run
   * @param {Object} [options] The options to pass to the task
   * @return {Promise<any>} A promise that resolves to the result of the task
   */
  runTask (taskName, options = {}) {
    if (taskName in this.tasks) {
      const task = this.tasks[taskName]
      return task.dependencies.reduce((p, d, index) => {
        if (typeof d === 'string') {
          d = { task: d }
        }

        if (this.canRunTask(d.task)) {
          const depTask = this.tasks[d.task]
          const depOptions = Object.assign({}, options, d.options || {})
          return p.then(results => {
            return this.runTask(d.task, depOptions)
              .then(result => results.concat(result))
          })
        } else {
          return p.then(() => {
            throw new Error(`Dependent task ${d.task} not found`)
          })
        }
      }, Promise.resolve([])).then(results => {
        return task.run(options, this, results.slice())
      })
    } else {
      return Promise.reject(new Error(`Task ${taskName} does not exist`))
    }
  }

  /**
   * Attempts to run a task by name without running its dependent tasks.
   *
   * @param {string} taskName The name of the task to run
   * @param {Object} options The options to pass to the task
   * @return {Promise<any>} A promise that resolves to the result of the task
   */
  runTaskWithoutDependencies (taskName, options = {}) {
    if (taskName in this.tasks) {
      const task = this.tasks[taskName]
      return new Promise((resolve, reject) => {
        resolve(task.run(options, this, []))
      }).catch(error => {
        return this.reject(error)
      })
    } else {
      return this.reject(new Error(`Task ${taskName} does not exist`))
    }
  }
}
/** @private */
TaskEngine.instance = null
/**
 * Retrieves the singleton instance of the TaskEngine.
 */
TaskEngine.getInstance = () => {
  return TaskEngine.instance || (
    TaskEngine.instance = new TaskEngine()
  )
}
/**
 * A convenient task function decorator factory that makes it a bit easier to
 * specify dependencies and/or a task's name for tasks added from an object or
 * array.
 *
 * Overloads:
 * TaskEngine.task(taskName, dependencies, task)
 * TaskEngine.task(taskName, task)
 * TaskEngine.task(task)
 * TaskEngine.task(taskName, dependencies)
 * TaskEngine.task(taskName)
 * TaskEngine.task()
 *
 * Example:
 * tEngine.addTasksFromObject([
 *  TaskEngine.task(
 *    [ 'otherTask' ],
 *    () => {
 *      // do task
 *    }
 *  )
 * ])
 *
 * Example with ES2016 decorator support (currently needs transpiler):
 * const task = TaskEngine.task
 * tEngine.addTasksFromObject({
 *  // Give a new name to the task at the same time as specifying dependencies
 *  @task('myNewTask', [ 'otherTask' ])
 *  myTask () {
 *    // do task
 *  }
 * })
 *
 * @param {string} [taskName] The task name
 * @param {string[] | {task:string, options?:Object}[]} [dependencies] The task dependencies
 * @param {Function} [task] The task to decorate immediately and return
 * @return {{(task:Function, key:string, descriptor:any): Function}} The decorator
 */
TaskEngine.task = (taskName, dependencies, task = null) => {
  if (typeof taskName === 'function') {
    task = taskName
    dependencies = []
    taskName = task.name
  }

  if (typeof dependencies === 'function') {
    task = dependencies
    dependencies = []
  }

  if (Array.isArray(taskName)) {
    dependencies = taskName
    taskName = ''
  }

  const decorator = (target, key, descriptor) => {
    if (Array.isArray(dependencies)) {
      target.dependencies = dependencies
    }
    if (taskName) {
      target.taskName = taskName
    }
    return descriptor
  }

  if (typeof task === 'function') {
    decorator(task)
    return task
  } else {
    return decorator
  }
}

module.exports = exports = TaskEngine
exports.default = TaskEngine
exports.TaskEngine = TaskEngine
