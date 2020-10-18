let throng = require("throng");
let Queue = require("bull");

// Connect to a local redis instance locally, and the Heroku-provided URL in production
let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
let WORKERS = process.env.WEB_CONCURRENCY || 3;

// The maximum number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
let maxJobsPerWorker = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function start(id) {
  console.log(`Started worker ${id}`);

  // Connect to the named work queue
  let workQueue = new Queue("work", REDIS_URL);

  workQueue.process(maxJobsPerWorker, async (job) => {
    console.log("Inside the workQueue process bitch", job.data);
    console.log(`Worker id ${id} working on job id ${job.id}`);
    // This is an example job that just slowly reports on progress
    // while doing no work. Replace this with your own job logic.
    let progress = 0;

    while (progress < 100) {
      if (await job.isFailed()) {
        console.log("Job failed. Processing is halted.");
        console.log("Killing process");
        process.kill(id);
      }

      await sleep(200);
      progress += 1;
      job.progress(progress);
    }

    // A job can return values that will be stored in Redis as JSON
    // This return value is unused in this demo application.
    return { value: "This will be stored" };
  });

  workQueue.on("failed", function (job) {
    console.log("Request to failed jobs");
  });

  workQueue.on("completed", (job) => {
    console.log(`Job progress completed ${job.id} ${job.data.name}`);
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ worker: start, count: WORKERS, lifetime: Infinity });
