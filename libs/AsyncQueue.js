import { EventEmitter } from 'events';

/**
 * @template T
 */
class AsyncQueue extends EventEmitter {

    constructor(limit) {
        super();
        this.limit = limit;
        this.setMaxListeners(40);
    }
    
    limit = 0;
    buf = [];

    /** @param {T} data */
    async push(data) {
        if(this.limit == 0) {
            this.buf.push(data);
            this.emit("push");
            return;
        } else {
            while(this.buf.length >= this.limit)
                await new Promise(resolve=> {
                    this.once("pop", resolve);
                });
            this.buf.push(data);
            this.emit("push");
        }
    }

    /** @returns {Promise<T>} */
    async pop() {
        if(this.buf.length == 0)
            await new Promise(resolve=> this.once("push", resolve));
        const data = this.buf.shift();
        this.emit("pop");
        return data;
    }

    destroy() {
        this.listeners("push").forEach(i=> {
            i();
            this.removeListener("push", i);
        });
        this.listeners("pop").forEach(i=> {
            i();
            this.removeListener("pop", i);
        });
    }
};

export {
    AsyncQueue,
};