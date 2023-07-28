import * as fs from "fs/promises";
import * as worker_threads from "worker_threads";

import * as util from "./libs/util.js";

async function main() {
    const config = JSON.parse(await fs.readFile("./config.json", "utf-8"));
    const thread_cnt = config.thread_cnt || 1;
    const concurrency_per_thread = config.concurrency_per_thread || 8;
    /** @type {string[]} */
    const ips_or_ranges = config.hosts || [];
    const ips = ips_or_ranges.reduce((prev, curr)=> {
        if(curr.includes('/'))
            return prev.concat(util.ipv4CIDRToRange(curr));
        else
            return prev.concat([curr]);
    }, []);
    const ips_slices = Array.from({ length: thread_cnt }).map((i, n)=> {
        return ips.slice(n * ips.length / thread_cnt, (n+1) * ips.length / thread_cnt);
    });
    console.log(ips_slices);
    const workers = Array.from({ length: thread_cnt }).map((i, n)=> {
        return new worker_threads.Worker('./do_scan.js', {
            execArgv: ["--tls-max-v1.2"],
            workerData: {
                ips: ips_slices[n],
                strategy: "fuck",
                concurrency: concurrency_per_thread
            }
        });
    });
    workers.forEach((i,n)=> {
        i.on("message", async (msg)=> {
            const obj = Object.fromEntries(msg); 
            await fs.writeFile(`./result-${n}.json`, JSON.stringify(obj, (key, value)=> {
                if(value instanceof Set)
                    return Array.from(value);
                if(value instanceof Map)
                    return Object.fromEntries(value);
                return value;
            }, 2));
        });
    });
    await Promise.all(workers.map(i=> new Promise((resolve, reject)=> {
        i.on("error", reject);
        i.on("exit", resolve);
    })));
    console.log("--- ALL JOBS HAS BEEN DONE ---");
}

main().catch(console.log);