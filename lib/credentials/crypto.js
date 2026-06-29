"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMEK = getMEK;
exports.encryptCredential = encryptCredential;
exports.decryptCredential = decryptCredential;
var crypto_1 = require("crypto");
var supabase_1 = require("../../supabase/supabase");
var VAULT_SECRET_NAME = 'platform_credentials_mek';
var ALGORITHM = 'aes-256-gcm';
var IV_BYTES = 12; // 96-bit IV
var KEY_BYTES = 32; // 256-bit key
var AUTH_TAG_BYTES = 16; // 128-bit GCM auth tag
/**
 * Retrieves the Master Encryption Key (MEK).
 *
 * Resolution order:
 *  1. Supabase Vault (`vault_get_secret` RPC) — preferred in production.
 *  2. `PLATFORM_CREDENTIALS_MEK` env var (base64-encoded 32-byte key) — used
 *     when Vault is not yet provisioned (e.g. dev / Supabase free tier).
 *
 * Throws if neither source yields a valid 32-byte key.
 */
function getMEK() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error, key, _b, envMek, key;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, supabase_1.supabaseAdmin.rpc('vault_get_secret', {
                            secret_name: VAULT_SECRET_NAME,
                        })];
                case 1:
                    _a = _c.sent(), data = _a.data, error = _a.error;
                    if (!error && data != null) {
                        key = Buffer.from(data, 'base64');
                        if (key.length === KEY_BYTES)
                            return [2 /*return*/, key];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    _b = _c.sent();
                    return [3 /*break*/, 3];
                case 3:
                    envMek = process.env.PLATFORM_CREDENTIALS_MEK;
                    if (envMek) {
                        key = Buffer.from(envMek, 'base64');
                        if (key.length === KEY_BYTES)
                            return [2 /*return*/, key];
                        throw new Error('PLATFORM_CREDENTIALS_MEK env var is set but is not a valid base64-encoded 32-byte key.');
                    }
                    throw new Error('MEK not available: set PLATFORM_CREDENTIALS_MEK env var (base64, 32 bytes) ' +
                        'or provision the Vault secret "platform_credentials_mek".');
            }
        });
    });
}
/**
 * Encrypts a credential payload using envelope encryption:
 *  1. Generates a random 256-bit DEK and 96-bit IV.
 *  2. Encrypts the JSON-stringified payload with AES-256-GCM (DEK + IV),
 *     appending the 16-byte auth tag to the ciphertext.
 *  3. Wraps the DEK with the MEK (fresh random 96-bit dekIv),
 *     storing dekIv | encryptedDek | dekAuthTag.
 *
 * Returns all three values as base64 strings.
 */
function encryptCredential(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var mek, dek, iv, cipher, payloadJson, encryptedBody, payloadAuthTag, encryptedPayload, dekIv, dekCipher, encryptedDekBody, dekAuthTag, encryptedDekFull;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getMEK()];
                case 1:
                    mek = _a.sent();
                    dek = (0, crypto_1.randomBytes)(KEY_BYTES);
                    iv = (0, crypto_1.randomBytes)(IV_BYTES);
                    cipher = (0, crypto_1.createCipheriv)(ALGORITHM, dek, iv);
                    payloadJson = JSON.stringify(payload);
                    encryptedBody = Buffer.concat([
                        cipher.update(payloadJson, 'utf8'),
                        cipher.final(),
                    ]);
                    payloadAuthTag = cipher.getAuthTag();
                    encryptedPayload = Buffer.concat([encryptedBody, payloadAuthTag]);
                    dekIv = (0, crypto_1.randomBytes)(IV_BYTES);
                    dekCipher = (0, crypto_1.createCipheriv)(ALGORITHM, mek, dekIv);
                    encryptedDekBody = Buffer.concat([
                        dekCipher.update(dek),
                        dekCipher.final(),
                    ]);
                    dekAuthTag = dekCipher.getAuthTag();
                    encryptedDekFull = Buffer.concat([dekIv, encryptedDekBody, dekAuthTag]);
                    return [2 /*return*/, {
                            encryptedPayload: encryptedPayload.toString('base64'),
                            encryptedDek: encryptedDekFull.toString('base64'),
                            iv: iv.toString('base64'),
                        }];
            }
        });
    });
}
/**
 * Decrypts a stored credential:
 *  1. Unwraps the DEK from encryptedDek using MEK + dekIv + dekAuthTag.
 *  2. Decrypts encryptedPayload using DEK + iv + payloadAuthTag.
 *
 * Auth tag mismatches propagate naturally (callers convert to HTTP 422).
 */
function decryptCredential(row) {
    return __awaiter(this, void 0, void 0, function () {
        var mek, encryptedDekFull, dekIv, dekBody, dekAuthTag, dekDecipher, dek, encryptedPayloadFull, payloadBody, payloadAuthTag, iv, decipher, plaintext;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getMEK()];
                case 1:
                    mek = _a.sent();
                    encryptedDekFull = Buffer.from(row.encryptedDek, 'base64');
                    dekIv = encryptedDekFull.subarray(0, IV_BYTES);
                    dekBody = encryptedDekFull.subarray(IV_BYTES, encryptedDekFull.length - AUTH_TAG_BYTES);
                    dekAuthTag = encryptedDekFull.subarray(encryptedDekFull.length - AUTH_TAG_BYTES);
                    dekDecipher = (0, crypto_1.createDecipheriv)(ALGORITHM, mek, dekIv);
                    dekDecipher.setAuthTag(dekAuthTag);
                    dek = Buffer.concat([dekDecipher.update(dekBody), dekDecipher.final()]);
                    encryptedPayloadFull = Buffer.from(row.encryptedPayload, 'base64');
                    payloadBody = encryptedPayloadFull.subarray(0, encryptedPayloadFull.length - AUTH_TAG_BYTES);
                    payloadAuthTag = encryptedPayloadFull.subarray(encryptedPayloadFull.length - AUTH_TAG_BYTES);
                    iv = Buffer.from(row.iv, 'base64');
                    decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, dek, iv);
                    decipher.setAuthTag(payloadAuthTag);
                    plaintext = Buffer.concat([
                        decipher.update(payloadBody),
                        decipher.final(),
                    ]).toString('utf8');
                    return [2 /*return*/, JSON.parse(plaintext)];
            }
        });
    });
}
