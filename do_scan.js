import { workerData , parentPort } from "worker_threads";

import { pipeline } from "stream/promises";
import { Scanner } from "./Scanner.js";
import { TagMaker } from "./TagMaker/TagMaker.js";
import { Prober } from "./Prober/Prober.js";
import { makeMuxer } from "./Muxer.js";
import { Reducer } from "./Reducer.js";
import { AsyncRunner } from "./libs/AsyncRunner.js";

import { loadProbes } from "./Prober/probeRegistry.js";
import { loadTaggers } from "./TagMaker/taggerRegistry.js";

const CONCURRENT_PROBES = 8;

async function do_scan(ips, strategy, concurrency) {
    await loadProbes();
    await loadTaggers();
    console.log("all taggers and probes loaded");
    const scanner = new Scanner(ips, {
        scan_strategy: strategy,
    });
    const runner = new AsyncRunner(concurrency || CONCURRENT_PROBES);
    const [ mux_feedback, mux_input, feedback_cnt ] = makeMuxer();
    const prober = new Prober(feedback_cnt, runner, {
        /** @type {(error: Error, probe: Prober)=>void} */
        errorHandler: (error, probe)=> {
            console.log(`// probe ${probe.name} failed with error:`, error);
        }
    });
    const tagmakeer = new TagMaker(feedback_cnt, {
        /** @type {(error: Error, tagger: TagMaker)=>void} */
        errorHandler: (error, tagger)=> {
            console.log(`// tagger ${tagger.name} failed with error:`, error);
        }
    });
    const reducer = new Reducer();    
    feedback_cnt.on("fuck", ()=> {
        console.log(scanner, runner, mux_feedback, mux_input, prober, tagmakeer);
        feedback_cnt.emit("change");
    });
    await pipeline(
        scanner,
        mux_feedback,
        prober,
        tagmakeer,
        mux_input,
        reducer
    ).catch(err=>console.log("pipeline: ", err));
    console.log("--- RUNNER DONE ---");
    const result = Object.fromEntries(reducer.result);
    console.log(result);
    return reducer.result;
}
console.log("started");
if(workerData?.ips && workerData?.strategy && workerData?.concurrency) {
    console.log("worker started");
    const ips = workerData.ips;
    const strategy = workerData.strategy;
    const concurrency = workerData.concurrency;
    const result = await do_scan(ips, strategy, concurrency);
    if(parentPort)
        parentPort.postMessage(result);
}

process.on("unhandledRejection", (err)=> { 
    console.log("unhandledRejection", err)
});
process.on("uncaughtException", (err)=> {
    console.log("uncaughtException", err);
});

export {
    do_scan
}