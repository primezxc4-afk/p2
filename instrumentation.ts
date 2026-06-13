export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    setInterval(() => {
      const { heapUsed, rss } = process.memoryUsage();
      console.log(
        `Heap: ${(heapUsed / 1024 / 1024).toFixed(1)}MB | RSS: ${(rss / 1024 / 1024).toFixed(1)}MB`,
      );
    }, 60000);
  }
}
