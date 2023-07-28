import { Transform, Readable, Writable, PassThrough, Duplex } from "stream";
import { AsyncQueue } from "./libs/AsyncQueue.js";
import { EventEmitter } from "events";
//import { ScanData } from "./libs/typedef.js";


class MuxerFeedback extends Duplex {
    /** @param {Readable} channel */
    constructor(channel, feedback_counter) {
        super({ objectMode: true });
        channel.on("data", async (object)=> {
            try {
                await this.queue.push(object);
            } catch(err) {
                console.log("MuxerFeedbackInner3: ", err);
            }
        });
        this.feedback_counter = feedback_counter;
        this.once("finish", ()=> {
            console.log("MuxerFeedback: finish, channel:", channel.readableEnded, this.feedback_counter.cnt);
            feedback_counter.on("change", ()=> {
                if(feedback_counter.cnt <= 0) {
                    console.log("MuxerInput: cnt finish");
                    clearInterval(intv);
                    channel.end();
                }
            });
            feedback_counter.emit("change");
        });

        channel.once("end", ()=> {
            console.log("MuxerFeedback: channel end");
            this.queue.destroy();
            this.end();
            this.push(null);
        });
    }

    is_ended = false;
    /** @type {AsyncQueue<ScanData>} */
    queue = new AsyncQueue(2);

    /** @param {ScanData} scan_data */
    async _write(scan_data, encoding, callback) {
        try {
            this.feedback_counter.inc(1, );
            await this.queue.push(scan_data);
        } catch(err) {
            console.log("MuxerFeedbackInner1: ", err);
        }
        callback();
    }

    async _read() {
        try {
            const result = await this.queue.pop(); 
            if(result == undefined)
                return this.push(null);
            this.push(result);
        } catch(err) {
            console.log("MuxerFeedbackInner2: ", err);
        } 
    }
};

class MuxerInput extends Transform {
    /** @param {Writable} channel */
    constructor(channel, feedback_counter) {
        super({ objectMode: true });
        this.channel = channel;
        this.feedback_counter = feedback_counter;
    }

    /** @param {ScanData} object */
    _transform(object, encoding, callback) {
        if(!object) {
            this.feedback_counter.dec();
            return callback();
        }
        if(object.done) {
            this.feedback_counter.dec();
            this.push(object);  // the Prober and Tagger is done with this host, send it to the output
        } else
            this.channel.write(object); // Tagger added more tags, send it back to the Prober
        callback();
    }
};

class FeedbackCounter extends EventEmitter {
    constructor() {
        super();
    }

    cnt = 0;
    logs = new Map();
    inc(num=1, logkey, logval) {
        this.cnt += num;
        if(logkey)
            this.logs.set(logkey, logval);
        //console.log("FeedbackCounter: ", this.cnt);
        this.emit("change");
    }

    dec(num=1, logkey) {
        this.cnt -= num;
        if(logkey)
            this.logs.delete(logkey);
        //console.log("FeedbackCounter: ", this.cnt);
        this.emit("change");
    }

};

function makeMuxer() {
    const pass_through = new PassThrough({objectMode: true});
    const feedback_counter = new FeedbackCounter();
    pass_through.on("error", err=> {
        console.log("PASSTHROUGH", err);
    });
    const input = new MuxerInput(pass_through, feedback_counter);
    const feedback = new MuxerFeedback(pass_through, feedback_counter);
    return [feedback, input, feedback_counter];
}

export {
    makeMuxer,
};