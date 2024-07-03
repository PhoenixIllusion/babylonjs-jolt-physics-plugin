export var GroundState;
(function (GroundState) {
    GroundState[GroundState["ON_GROUND"] = 0] = "ON_GROUND";
    GroundState[GroundState["RISING"] = 1] = "RISING";
    GroundState[GroundState["FALLING"] = 2] = "FALLING";
})(GroundState || (GroundState = {}));
export var CharacterState;
(function (CharacterState) {
    CharacterState[CharacterState["IDLE"] = 0] = "IDLE";
    CharacterState[CharacterState["MOVING"] = 1] = "MOVING";
    CharacterState[CharacterState["JUMPING"] = 2] = "JUMPING";
})(CharacterState || (CharacterState = {}));
