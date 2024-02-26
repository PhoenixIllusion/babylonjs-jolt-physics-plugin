import { ContactCollector, JoltContactSetting, OnContactValidateResponse } from "../jolt-contact";
import Jolt from "../jolt-import";
import { JoltJSPlugin } from "./jolt-physics";

export type CollisionMap = {'add': Set<number>, 'remove': Set<number>, 'persist': Set<number>};

export class ContactCollectorV2 {
  private _contactCollector;

  constructor( private joltV2: JoltJSPlugin, contactListener: Jolt.ContactListenerJS, private collisionMap: CollisionMap) {
    this._contactCollector = new ContactCollector(contactListener, this);
  }


  onContactRemove(body: number, withBody: number): void {
    this.joltV2.onContactRemove(body, withBody);
  }

  onContactAdd(body: number, withBody: number, contactSettings: JoltContactSetting): void {
    this.joltV2.onContactAdd(body, withBody, contactSettings);
  }

  onContactPersist(body: number, withBody: number, contactSettings: JoltContactSetting): void {
    this.joltV2.onContactPersist(body, withBody, contactSettings);
  }

  onContactValidate(body: number, withBody: number): OnContactValidateResponse {
    return this.joltV2.onContactValidate(body, withBody);
  }

  registerImpostor(bodyID: number) {
    if(this.collisionMap.add.has(bodyID)) {
      this._contactCollector.registerImpostor(bodyID, 'on-contact-add')
    }
    if(this.collisionMap.remove.has(bodyID)) {
      this._contactCollector.registerImpostor(bodyID, 'on-contact-remove')
    }
    if(this.collisionMap.persist.has(bodyID)) {
      this._contactCollector.registerImpostor(bodyID, 'on-contact-persist')
    }
  }

  clear() {
    this._contactCollector.clear();
  }
}