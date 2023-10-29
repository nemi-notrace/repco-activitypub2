/**
 * This is a VERY BASIC implementation of a queue for outgoing requests.
 * This separates the sending of the messages, which could take a while, require retries, etc from the response to the server or UI.
 */
import Queue from "queue-promise";
export declare const queue: Queue;
//# sourceMappingURL=queue.d.ts.map