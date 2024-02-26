import { ContactCollector } from "../jolt-contact";
export class ContactCollectorV2 {
    constructor(joltV2, contactListener, collisionMap) {
        this.joltV2 = joltV2;
        this.collisionMap = collisionMap;
        this._contactCollector = new ContactCollector(contactListener, this);
    }
    onContactRemove(body, withBody) {
        this.joltV2.onContactRemove(body, withBody);
    }
    onContactAdd(body, withBody, contactSettings) {
        this.joltV2.onContactAdd(body, withBody, contactSettings);
    }
    onContactPersist(body, withBody, contactSettings) {
        this.joltV2.onContactPersist(body, withBody, contactSettings);
    }
    onContactValidate(body, withBody) {
        return this.joltV2.onContactValidate(body, withBody);
    }
    registerImpostor(bodyID) {
        if (this.collisionMap.add.has(bodyID)) {
            this._contactCollector.registerImpostor(bodyID, 'on-contact-add');
        }
        if (this.collisionMap.remove.has(bodyID)) {
            this._contactCollector.registerImpostor(bodyID, 'on-contact-remove');
        }
        if (this.collisionMap.persist.has(bodyID)) {
            this._contactCollector.registerImpostor(bodyID, 'on-contact-persist');
        }
    }
    clear() {
        this._contactCollector.clear();
    }
}
