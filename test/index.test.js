const assert = require('assert')
const TaskEngine = require('../lib/index')

describe('TaskEngine', function () {
  describe('#constructor', function () {
    it('should construct a TaskEngine instance with no tasks', function () {
      const tEngine = new TaskEngine()
      assert.deepStrictEqual(tEngine.getTaskNames(), [])
    })
  })

  describe('#addTask', function () {
    it('should throw when adding a task with no name', function () {
      const tEngine = new TaskEngine()
      assert.throws(() => {
        tEngine.addTask(() => {})
      })
      assert.deepStrictEqual(tEngine.getTaskNames(), [])
    })

    it('should add a task', function () {
      const tEngine = new TaskEngine()
      function someTask () { }
      function someTask2 () { }
      assert.doesNotThrow(() => {
        tEngine.addTask(someTask)
        tEngine.addTask(someTask2, [ 'yep' ])
        tEngine.addTask(someTask, 'biff')
        tEngine.addTask(someTask2, 'whoa', [ 'other' ])
      })
      assert.deepStrictEqual(tEngine.getTaskNames(), [
        'someTask',
        'someTask2',
        'biff',
        'whoa'
      ])
      assert.ok(tEngine.canRunTask('someTask'))
      assert.ok(tEngine.canRunTask('someTask2'))
      assert.ok(tEngine.canRunTask('biff'))
      assert.ok(tEngine.canRunTask('whoa'))
      assert.deepStrictEqual(tEngine.tasks.someTask, { run: someTask, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.someTask2, { run: someTask2, dependencies: [ 'yep' ] })
      assert.deepStrictEqual(tEngine.tasks.biff, { run: someTask, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.whoa, { run: someTask2, dependencies: [ 'other' ] })
    })

    it('should add a task using the alias method', function () {
      const tEngine = new TaskEngine()
      function someTask () { }
      function someTask2 () { }
      assert.doesNotThrow(() => {
        tEngine.t(someTask)
        tEngine.t(someTask2, [ 'yep' ])
        tEngine.t(someTask, 'biff')
        tEngine.t(someTask2, 'whoa', [ 'other' ])
      })
      assert.deepStrictEqual(tEngine.getTaskNames(), [
        'someTask',
        'someTask2',
        'biff',
        'whoa'
      ])
      assert.ok(tEngine.canRunTask('someTask'))
      assert.ok(tEngine.canRunTask('someTask2'))
      assert.ok(tEngine.canRunTask('biff'))
      assert.ok(tEngine.canRunTask('whoa'))
      assert.deepStrictEqual(tEngine.tasks.someTask, { run: someTask, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.someTask2, { run: someTask2, dependencies: [ 'yep' ] })
      assert.deepStrictEqual(tEngine.tasks.biff, { run: someTask, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.whoa, { run: someTask2, dependencies: [ 'other' ] })
    })
  })

  describe('#addTasksFromObject', function () {
    it('should add tasks', function () {
      const tEngine = new TaskEngine()
      const $task = TaskEngine.task

      const taskA = () => {}
      const taskB = () => {}
      const taskC = () => {}

      assert.doesNotThrow(() => {
        tEngine.addTasksFromObject({
          myTask1: $task([], taskA),
          myTask2: $task('taskB', [ 'taskC' ], taskB),
          myTask3: $task('taskC', taskC)
        })
      })

      assert.deepStrictEqual(tEngine.getTaskNames(), [ 'myTask1', 'taskB', 'taskC' ])
      assert.ok(tEngine.canRunTask('myTask1'))
      assert.ok(tEngine.canRunTask('taskB'))
      assert.ok(tEngine.canRunTask('taskC'))
      assert.deepStrictEqual(tEngine.tasks.myTask1, { run: taskA, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.taskB, { run: taskB, dependencies: [ 'taskC' ] })
      assert.deepStrictEqual(tEngine.tasks.taskC, { run: taskC, dependencies: [] })
    })

    it('should add tasks from an array', function () {
      const tEngine = new TaskEngine()
      const $task = TaskEngine.task

      const taskA = () => {}
      const taskB = () => {}
      const taskC = () => {}

      assert.doesNotThrow(() => {
        tEngine.addTasksFromObject([
          $task('myTask1', taskA),
          $task('taskB', [ 'taskC' ], taskB),
          $task('taskC', taskC)
        ])
      })

      assert.deepStrictEqual(tEngine.getTaskNames(), [ 'myTask1', 'taskB', 'taskC' ])
      assert.ok(tEngine.canRunTask('myTask1'))
      assert.ok(tEngine.canRunTask('taskB'))
      assert.ok(tEngine.canRunTask('taskC'))
      assert.deepStrictEqual(tEngine.tasks.myTask1, { run: taskA, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.taskB, { run: taskB, dependencies: [ 'taskC' ] })
      assert.deepStrictEqual(tEngine.tasks.taskC, { run: taskC, dependencies: [] })
    })

    it('should add tasks using the alias method', function () {
      const tEngine = new TaskEngine()
      const $task = TaskEngine.task

      const taskA = () => {}
      const taskB = () => {}
      const taskC = () => {}

      assert.doesNotThrow(() => {
        tEngine.t({
          myTask1: $task([], taskA),
          myTask2: $task('taskB', [ 'taskC' ], taskB),
          myTask3: $task('taskC', taskC)
        })
      })

      assert.deepStrictEqual(tEngine.getTaskNames(), [ 'myTask1', 'taskB', 'taskC' ])
      assert.ok(tEngine.canRunTask('myTask1'))
      assert.ok(tEngine.canRunTask('taskB'))
      assert.ok(tEngine.canRunTask('taskC'))
      assert.deepStrictEqual(tEngine.tasks.myTask1, { run: taskA, dependencies: [] })
      assert.deepStrictEqual(tEngine.tasks.taskB, { run: taskB, dependencies: [ 'taskC' ] })
      assert.deepStrictEqual(tEngine.tasks.taskC, { run: taskC, dependencies: [] })
    })
  })

  describe('#runTask', function () {
    it('should run a task with appropriate arguments', function (done) {
      const tEngine = new TaskEngine()

      function taskA (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi' })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
      }

      tEngine
        .addTask(taskA)
        .runTask('taskA', { message: 'hi' })
        .then(result => {
          assert.strictEqual(result, undefined)
        }).then(done, done)
    })

    it('should run a task that does not return a Promise', function (done) {
      const tEngine = new TaskEngine()

      function taskA () { }
      function taskB () { return 45 }

      tEngine
        .addTask(taskA)
        .addTask(taskB)
        .runTask('taskA')
        .then(result => {
          assert.strictEqual(result, undefined)
          return tEngine.runTask('taskB')
        }).then(result => {
          assert.strictEqual(result, 45)
        }).then(done, done)
    })

    it('should run a task that returns a Promise', function (done) {
      const tEngine = new TaskEngine()

      function taskA () { return Promise.resolve() }
      function taskB () { return Promise.resolve(45) }

      tEngine
        .addTask(taskA)
        .addTask(taskB)
        .runTask('taskA')
        .then(result => {
          assert.strictEqual(result, undefined)
          return tEngine.runTask('taskB')
        }).then(result => {
          assert.strictEqual(result, 45)
        }).then(done, done)
    })

    it('should reject when a task has a syncrhonous error', function (done) {
      const tEngine = new TaskEngine()

      function taskA () { return nope.g = 5; Promise.resolve() }

      tEngine
        .addTask(taskA)
        .runTask('taskA')
        .then(result => {
          done(new Error('taskA should have caused a rejection'))
        }).catch(error => {
          done()
        })
    })

    it('should reject when a task has an asyncrhonous error', function (done) {
      const tEngine = new TaskEngine()

      function taskA () { return Promise.reject(new Error('Nope')) }

      tEngine
        .addTask(taskA)
        .runTask('taskA')
        .then(result => {
          done(new Error('taskA should have caused a rejection'))
        }).catch(error => {
          done()
        })
    })

    it("should run a task's dependent tasks", function (done) {
      const tEngine = new TaskEngine()

      function taskA (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi' })
        assert.deepStrictEqual(results, [ 'B', 'C' ])
        assert.strictEqual(te, tEngine)
      }
      function taskB (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', age: 34 })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
        return 'B'
      }
      function taskC (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', name: 'Davey' })
        assert.deepStrictEqual(results, [ 'D' ])
        assert.strictEqual(te, tEngine)
        return 'C'
      }
      function taskD (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', name: 'Davey' })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
        return 'D'
      }

      tEngine
        .addTask(taskA, [
          { task: 'taskB', options: { age: 34 } },
          { task: 'taskC', options: { name: 'Davey' } }
        ])
        .addTask(taskB)
        .addTask(taskC, [ 'taskD' ])
        .addTask(taskD)
        .runTask('taskA', { message: 'hi' })
        .then(done, done)
    })

    it("should reject when a dependent task rejects", function (done) {
      this.timeout(3000)
      const tEngine = new TaskEngine()

      function taskA (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi' })
        assert.deepStrictEqual(results, [ 'B', 'C' ])
        assert.strictEqual(te, tEngine)
      }
      function taskB (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', age: 34 })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
        return 'B'
      }
      function taskC (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', name: 'Davey' })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
        return 'C'
      }
      function taskD (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi', name: 'Davey' })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
        throw new Error('Nope')
      }

      tEngine
        .addTask(taskA, [
          { task: 'taskB', options: { age: 34 } },
          { task: 'taskC', options: { name: 'Davey' } }
        ])
        .addTask(taskB)
        .addTask(taskC, [ 'taskD' ])
        .addTask(taskD)
        .runTask('taskA', { message: 'hi' })
        .then(() => {
          done(new Error('taskA should have rejected'))
        }, () => done())
    })
  })

  describe('#runTaskWithoutDependencies', function () {
    it("should run tasks without running dependencies", function (done) {
      const tEngine = new TaskEngine()

      function taskA (options, te, results) {
        assert.deepStrictEqual(options, { message: 'hi' })
        assert.deepStrictEqual(results, [])
        assert.strictEqual(te, tEngine)
      }
      function taskB (options, te, results) {
        assert.fail()
      }
      function taskC (options, te, results) {
        assert.fail()
      }
      function taskD (options, te, results) {
        assert.fail()
      }

      tEngine
        .addTask(taskA, [
          { task: 'taskB', options: { age: 34 } },
          { task: 'taskC', options: { name: 'Davey' } }
        ])
        .addTask(taskB)
        .addTask(taskC, [ 'taskD' ])
        .addTask(taskD)
        .runTaskWithoutDependencies('taskA', { message: 'hi' })
        .then(done, done)
    })
  })
})
