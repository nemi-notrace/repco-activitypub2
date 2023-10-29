declare const router: import("express-serve-static-core").Router;
export declare function createActor(name: string, domain: string, pubkey: string): {
    "@context": string[];
    id: string;
    type: string;
    preferredUsername: string;
    inbox: string;
    outbox: string;
    followers: string;
    publicKey: {
        id: string;
        owner: string;
        publicKeyPem: string;
    };
};
export declare function createWebfinger(name: string, domain: string): {
    subject: string;
    links: {
        rel: string;
        type: string;
        href: string;
    }[];
};
export default router;
//# sourceMappingURL=admin.d.ts.map