/**
 * Runs an array of async functions in parallel and returns their results.
 * Logs each result and any errors encountered.
 * @param {Array<Function>} tasks - Array of async functions returning promises.
 * @returns {Promise<Array>} - Resolves with array of results.
 */
export async function executeConcurrently(tasks) {
  const debug = false;
  if (!Array.isArray(tasks)) {
    console.log('parallel: tasks is not an array', { tasks });
    return [];
  }
  try {
    const promises = tasks.map((fn, i) => {
      try {
        const result = fn();
        debug && console.log(`parallel: task[${i}] started`);
        return result;
      } catch (err) {
        console.log(`parallel: task[${i}] threw synchronously`, err);
        return Promise.reject(err);
      }
    });
    const results = await Promise.allSettled(promises);
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        debug && console.log(`parallel: task[${i}] fulfilled`, res.value);
      } else {
        console.log(`parallel: task[${i}] rejected`, res.reason);
      }
    });
    return results.map(r => r.status === 'fulfilled' ? r.value : undefined);
  } catch (err) {
    console.log('parallel: error during execution', err);
    return [];
  }
}
