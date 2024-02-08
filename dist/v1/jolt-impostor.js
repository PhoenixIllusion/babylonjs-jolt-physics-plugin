import { PhysicsImpostor } from '@babylonjs/core/Physics/v1/physicsImpostor';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from '@babylonjs/core/Misc/logger';
export class JoltPhysicsImpostor extends PhysicsImpostor {
    constructor() {
        super(...arguments);
        this._JoltPhysicsCallback = { 'on-contact-add': [], 'on-contact-persist': [], 'on-contact-validate': [], 'on-contact-remove': [] };
    }
    registerOnJoltPhysicsCollide(kind, collideAgainst, func) {
        const collidedAgainstList = collideAgainst instanceof Array ?
            collideAgainst
            : [collideAgainst];
        if (kind == 'on-contact-validate') {
            const list = this._JoltPhysicsCallback['on-contact-validate'];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
        else if (kind == 'on-contact-remove') {
            const list = this._JoltPhysicsCallback['on-contact-remove'];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
        else {
            const list = this._JoltPhysicsCallback[kind];
            list.push({ callback: func, otherImpostors: collidedAgainstList });
        }
    }
    unregisterOnJoltPhysicsCollide(kind, collideAgainst, func) {
        const collidedAgainstList = collideAgainst instanceof Array ?
            collideAgainst
            : [collideAgainst];
        let index = -1;
        const found = this._JoltPhysicsCallback[kind].some((cbDef, idx) => {
            if (cbDef.callback === func && cbDef.otherImpostors.length === collidedAgainstList.length) {
                const sameList = cbDef.otherImpostors.every((impostor) => {
                    return collidedAgainstList.indexOf(impostor) > -1;
                });
                if (sameList) {
                    index = idx;
                }
                return sameList;
            }
            return false;
        });
        if (found) {
            this._JoltPhysicsCallback[kind].splice(index, 1);
        }
        else {
            Logger.Warn('Function to remove was not found');
        }
    }
    onJoltCollide(kind, event) {
        if (!this._JoltPhysicsCallback[kind].length) {
            return undefined;
        }
        if (event.body) {
            if (kind == 'on-contact-validate') {
                const ret = [];
                const list = this._JoltPhysicsCallback['on-contact-validate'];
                const e = event;
                list.filter((obj) => {
                    return obj.otherImpostors.indexOf(event.body) !== -1;
                }).forEach((obj) => {
                    const r = obj.callback(e.body);
                    if (r !== undefined) {
                        ret.push(r);
                    }
                });
                //if you have registered multiple validate callback between A & B and they disagree, you have big problems on your hand so I'm not trying to combine
                if (ret.length > 1) {
                    console.warn(`Warning: [${ret.length}] Validation Listeners registered between: `, this, event.body);
                }
                return ret[0];
            }
            else if (kind == 'on-contact-remove') {
                const list = this._JoltPhysicsCallback[kind];
                const e = event;
                list.filter((obj) => {
                    return obj.otherImpostors.indexOf(event.body) !== -1;
                }).forEach((obj) => {
                    obj.callback(e.body);
                });
            }
            else {
                let collisionHandlerCount = 0;
                const list = this._JoltPhysicsCallback[kind];
                const e = event;
                list.filter((obj) => {
                    return obj.otherImpostors.indexOf(event.body) !== -1;
                }).forEach((obj) => {
                    obj.callback(e.body, new Vector3(), e.ioSettings);
                    collisionHandlerCount++;
                });
                //if you have registered multiple OnContact callback between A & B and they try to modify the ioSettings, it will be a mess
                if (collisionHandlerCount > 1) {
                    console.warn(`Warning: [${collisionHandlerCount}] OnContact Listeners registered between: `, this, event.body);
                }
            }
        }
    }
}
