import { EventEmitter } from 'events';
import * as crypto from 'crypto';

class AsyncRunner extends EventEmitter {
    /** @param {number} concurrency */
    constructor(concurrency) {
        super();
        this.concurrency = concurrency;
    }

    concurrency = 0;
    running = 0;
    logs = new Map();
    /**
     * Execute a function asynchronously, and wait for it to finish
     * @template F
     * @param {F} func 
     * @param  {...any} args 
     * @returns {ReturnType<F>}
     */
    async run(func, ...args) {
        return new Promise((resolve, reject)=> {
            const wrapper = async ()=> {
                this.running++;
                try {
                    const result = await func(...args);
                    resolve(result);
                } catch (e) {
                    reject(e);
                } finally {
                    this.running--;
                    this.emit("done", this.running);
                }
            }
            if(this.running < this.concurrency || this.concurrency <= 0)
                wrapper();
            else
                this.on("done", ()=> {
                    if(this.running < this.concurrency || this.concurrency <= 0) {
                        wrapper();
                        this.off("done", arguments.callee);
                    }
                });
        });
    }

    /** 
     * Execute a function asynchronously, but only wait for it to start, not to finish
     * @param {Function} func
     * @return {Promise<void>} 
     * */
    async runAsync(func, ...args) {
        const func_text = func.toString();
        const func_id = crypto.randomUUID();
        const wrapper = async ()=> {
            this.logs.set(func_id, {func_text, args});
            this.running++;
            try {
                await func(...args);
            } catch (e) {} finally {
                this.running--;
                this.logs.delete(func_id);
                this.emit("done", this.running);
            }
        }
        return new Promise((resolve, reject)=> {
            if(this.running < this.concurrency || this.concurrency <= 0) {
                wrapper();
                resolve();
            }
                
            else {
                const f = ()=>{
                    if(this.running < this.concurrency || this.concurrency <= 0) {
                        wrapper();
                        resolve();
                        this.off("done", f);
                    }
                };
                this.on("done", f);
            }
                
        });
    }

};

export {
    AsyncRunner
};