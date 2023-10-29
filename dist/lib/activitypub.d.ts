/**
 * ActivityPubClient - a class for sending and fetching ActivityPub content
 */
export declare class ActivityPubClient {
    private _account;
    private _actor;
    constructor(account?: any);
    set actor(actor: any);
    get actor(): any;
    set account(account: any);
    get account(): any;
    webfinger(username: string): Promise<unknown>;
    fetchActor(userId: string): Promise<unknown>;
    /**
     * Fetch an ActivityPub URL using the current actor to sign the request
     * @param {*} targetUrl url of activitypub resource
     * @param {*} options options for the fetch, excluding header
     * @returns a fetch promise
     */
    fetch(targetUrl: string, options: any): Promise<import("node-fetch").Response>;
    /**
     * Send an ActivityPub activity to a user
     * @param {*} recipient
     * @param {*} message
     * @returns a fetch result
     */
    send(recipient: any, message: any): Promise<void>;
    /**
     * Send a follow request
     * @param {*} recipient
     * @returns
     */
    sendFollow(recipient: any): Promise<{
        "@context": string;
        id: string;
        type: string;
        actor: any;
        object: any;
    }>;
    /**
     * Send an undo about a previously sent follow
     * @param {*} recipient
     * @param {*} originalActivityId
     * @returns
     */
    sendUndoFollow(recipient: any, originalActivityId: any): Promise<{
        "@context": string;
        id: string;
        type: string;
        actor: any;
        object: {
            id: any;
            type: string;
            actor: any;
            object: any;
        };
    }>;
    /**
     * Send an Accept for an incoming follow request
     * @param {*} followRequest
     */
    sendAccept(recipient: any, followRequest: any): Promise<{
        "@context": string;
        id: string;
        type: string;
        actor: any;
        object: any;
    }>;
    /**
     * Send an outbound update activity to a follower or recipient of a message
     * @param {*} recipient
     * @param {*} object
     * @returns
     */
    sendUpdate(recipient: any, object: any): Promise<{
        "@context": string;
        id: string;
        published: any;
        type: string;
        actor: any;
        object: any;
        to: any;
        cc: any;
    }>;
    /**
     * Send an outbound create activity to a follower or recipient of a message
     * @param {*} recipient
     * @param {*} object
     * @returns
     */
    sendCreate(recipient: any, object: any): Promise<{
        "@context": string;
        id: string;
        published: any;
        type: string;
        actor: any;
        object: any;
        to: any;
        cc: any;
    }>;
    /**
     * Send a boost for a specific post to the posts author and our followers
     * @param {*} primaryRecipient
     * @param {*} post
     * @param {*} followers
     * @returns
     */
    sendBoost(primaryRecipient: any, post: any, followers: any): Promise<{
        "@context": string;
        id: string;
        type: string;
        actor: any;
        published: string;
        object: any;
        to: string[];
        cc: any[];
    }>;
    /**
     * Send an undo of a previously sent boost
     * @param {*} primaryRecipient
     * @param {*} post
     * @param {*} followers
     * @param {*} originalActivityId
     * @returns
     */
    sendUndoBoost(primaryRecipient: any, post: any, followers: any, originalActivityId: any): Promise<{
        "@context": string;
        id: string;
        type: string;
        actor: any;
        object: {
            id: any;
            type: string;
            actor: any;
            object: any;
        };
        to: string[];
        cc: any[];
    }>;
    getUsernameDomain(userIdorName: any): {
        username: any;
        targetDomain: any;
    };
    getUsername(userIdorName: any): string;
    fetchOutbox(actor: any): Promise<never[] | {
        outbox: any;
        page: any;
        items: any;
    }>;
    /**
     * Validate the signature on an incoming request to the inbox
     * @param {*} actor
     * @param {*} req
     * @returns true if signature is valid
     */
    validateSignature(actor: any, req: any): boolean;
}
export declare const ActivityPub: ActivityPubClient;
//# sourceMappingURL=activitypub.d.ts.map