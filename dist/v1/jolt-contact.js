import { ContactCollector } from "../jolt-contact";
import { JoltPhysicsImpostor } from "./jolt-impostor";
export class ContactCollectorV1 {
    constructor(contactListener) {
        this._imposterBodyHash = {};
        this._contactCollector = new ContactCollector(contactListener, this);
    }
    onContactRemove(body, withBody) {
        const body1 = this._imposterBodyHash[body];
        const body2 = this._imposterBodyHash[withBody];
        return body1.onJoltCollide('on-contact-remove', { body: body2 });
    }
    onContactAdd(body, withBody, contactSettings) {
        const body1 = this._imposterBodyHash[body];
        const body2 = this._imposterBodyHash[withBody];
        if (body1 instanceof JoltPhysicsImpostor) {
            return body1.onJoltCollide('on-contact-add', { body: body2, ioSettings: contactSettings });
        }
        body1.onCollide({ body: body2, point: null, distance: 0, impulse: 0, normal: null });
    }
    onContactPersist(body, withBody, contactSettings) {
        const body1 = this._imposterBodyHash[body];
        const body2 = this._imposterBodyHash[withBody];
        if (body1 instanceof JoltPhysicsImpostor) {
            return body1.onJoltCollide('on-contact-persist', { body: body2, ioSettings: contactSettings });
        }
        body1.onCollide({ body: body2, point: null, distance: 0, impulse: 0, normal: null });
    }
    onContactValidate(body, withBody) {
        const body1 = this._imposterBodyHash[body];
        const body2 = this._imposterBodyHash[withBody];
        return body1.onJoltCollide('on-contact-validate', { body: body2 });
    }
    clear() {
        this._imposterBodyHash = {};
        this._contactCollector.clear();
    }
    registerImpostor(bodyID, impostor) {
        const keys = ['on-contact-add', 'on-contact-persist', 'on-contact-validate', 'on-contact-remove'];
        this._imposterBodyHash[bodyID] = impostor;
        if (impostor._onPhysicsCollideCallbacks.length > 0) {
            this._contactCollector.registerImpostor(bodyID, 'on-contact-add');
            this._contactCollector.registerImpostor(bodyID, 'on-contact-persist');
        }
        if (impostor instanceof JoltPhysicsImpostor) {
            keys.forEach((key) => {
                if (impostor._JoltPhysicsCallback[key].length > 0) {
                    this._contactCollector.registerImpostor(bodyID, key);
                }
            });
        }
    }
}
