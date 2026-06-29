"use strict";
/**
 * GallaboxService — WhatsApp Business API via Gallabox
 *
 * All Gallabox REST endpoints follow this pattern:
 *   https://server.gallabox.com/devapi/accounts/{accountId}/{resource}
 *
 * Auth headers: apikey + apisecret
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.GallaboxService = exports.GallaboxServiceError = void 0;
exports.createGallaboxService = createGallaboxService;
exports.getGallaboxService = getGallaboxService;
exports.resetGallaboxService = resetGallaboxService;
var GallaboxServiceError = /** @class */ (function (_super) {
    __extends(GallaboxServiceError, _super);
    function GallaboxServiceError(message, statusCode, originalError) {
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.originalError = originalError;
        _this.name = 'GallaboxServiceError';
        return _this;
    }
    return GallaboxServiceError;
}(Error));
exports.GallaboxServiceError = GallaboxServiceError;
var GallaboxService = /** @class */ (function () {
    function GallaboxService(config) {
        this.baseUrl = 'https://server.gallabox.com/devapi';
        this.retries = 3;
        this.timeout = 30000;
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.accountId = config.accountId;
    }
    Object.defineProperty(GallaboxService.prototype, "headers", {
        // ── Private helpers ───────────────────────────────────────────────────────
        get: function () {
            return {
                'apiKey': this.apiKey,
                'apiSecret': this.apiSecret,
                'Content-Type': 'application/json',
            };
        },
        enumerable: false,
        configurable: true
    });
    /** Builds a scoped path: /accounts/{accountId}/{resource} */
    GallaboxService.prototype.path = function (resource) {
        return "/accounts/".concat(this.accountId, "/").concat(resource);
    };
    GallaboxService.prototype.fetchWithRetry = function (path_1) {
        return __awaiter(this, arguments, void 0, function (path, options) {
            var lastError, _loop_1, this_1, attempt, state_1;
            var _a;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        lastError = null;
                        _loop_1 = function (attempt) {
                            var controller_1, timeoutId, res, body, _c, err_1, err_2;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        _d.trys.push([0, 8, , 11]);
                                        controller_1 = new AbortController();
                                        timeoutId = setTimeout(function () { return controller_1.abort(); }, this_1.timeout);
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 6, , 7]);
                                        return [4 /*yield*/, fetch("".concat(this_1.baseUrl).concat(path), __assign(__assign({}, options), { headers: __assign(__assign({}, this_1.headers), ((_a = options.headers) !== null && _a !== void 0 ? _a : {})), signal: controller_1.signal }))];
                                    case 2:
                                        res = _d.sent();
                                        clearTimeout(timeoutId);
                                        if (!!res.ok) return [3 /*break*/, 4];
                                        return [4 /*yield*/, res.text().catch(function () { return ''; })];
                                    case 3:
                                        body = _d.sent();
                                        throw new GallaboxServiceError("Gallabox API error ".concat(res.status, ": ").concat(body), res.status);
                                    case 4:
                                        _c = {};
                                        return [4 /*yield*/, res.json()];
                                    case 5: return [2 /*return*/, (_c.value = (_d.sent()), _c)];
                                    case 6:
                                        err_1 = _d.sent();
                                        clearTimeout(timeoutId);
                                        throw err_1;
                                    case 7: return [3 /*break*/, 11];
                                    case 8:
                                        err_2 = _d.sent();
                                        lastError = err_2;
                                        if (!(attempt < this_1.retries)) return [3 /*break*/, 10];
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000 * Math.pow(2, attempt)); })];
                                    case 9:
                                        _d.sent();
                                        _d.label = 10;
                                    case 10: return [3 /*break*/, 11];
                                    case 11: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        attempt = 0;
                        _b.label = 1;
                    case 1:
                        if (!(attempt <= this.retries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(attempt)];
                    case 2:
                        state_1 = _b.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _b.label = 3;
                    case 3:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 4: throw new GallaboxServiceError("Gallabox request failed after ".concat(this.retries + 1, " attempts: ").concat(lastError === null || lastError === void 0 ? void 0 : lastError.message), undefined, lastError !== null && lastError !== void 0 ? lastError : undefined);
                }
            });
        });
    };
    // ── Public API ────────────────────────────────────────────────────────────
    /**
     * Test the connection.
     * Calls GET /accounts/{accountId}/users — the official Gallabox test endpoint.
     * No webhook setup required.
     */
    GallaboxService.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, users, firstName, error_1;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!this.accountId) {
                            return [2 /*return*/, { success: false, error: 'Account ID is required for Gallabox API calls.' }];
                        }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.fetchWithRetry(this.path('users'))];
                    case 2:
                        data = _f.sent();
                        users = Array.isArray(data) ? data : ((_a = data === null || data === void 0 ? void 0 : data.data) !== null && _a !== void 0 ? _a : []);
                        firstName = (_e = (_c = (_b = users[0]) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : (_d = users[0]) === null || _d === void 0 ? void 0 : _d.firstName) !== null && _e !== void 0 ? _e : null;
                        return [2 /*return*/, {
                                success: true,
                                accountInfo: {
                                    id: this.accountId,
                                    name: firstName
                                        ? "Connected \u2014 ".concat(firstName).concat(users.length > 1 ? " +".concat(users.length - 1, " more") : '')
                                        : "Connected (".concat(users.length, " user").concat(users.length !== 1 ? 's' : '', ")"),
                                },
                            }];
                    case 3:
                        error_1 = _f.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Connection test failed',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send a WhatsApp message via Gallabox.
     * Docs: POST /accounts/{accountId}/messages
     */
    GallaboxService.prototype.sendMessage = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var phone, payload, components, result, messageId, error_2;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!this.accountId) {
                            return [2 /*return*/, { success: false, error: 'Account ID is required' }];
                        }
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 3, , 4]);
                        phone = params.to.replace(/^\+/, '').replace(/\D/g, '');
                        payload = {
                            channelId: (_a = params.channelId) !== null && _a !== void 0 ? _a : '',
                            channelType: 'whatsapp',
                            recipient: { phone: phone },
                        };
                        if (params.type === 'text' && params.text) {
                            payload.whatsapp = {
                                type: 'text',
                                text: { body: params.text },
                            };
                        }
                        else if (params.type === 'template' && params.template) {
                            components = [];
                            if ((_b = params.template.headerVariables) === null || _b === void 0 ? void 0 : _b.length) {
                                components.push({
                                    type: 'header',
                                    parameters: params.template.headerVariables.map(function (v) { return ({ type: 'text', text: v }); }),
                                });
                            }
                            if ((_c = params.template.bodyVariables) === null || _c === void 0 ? void 0 : _c.length) {
                                components.push({
                                    type: 'body',
                                    parameters: params.template.bodyVariables.map(function (v) { return ({ type: 'text', text: v }); }),
                                });
                            }
                            payload.whatsapp = {
                                type: 'template',
                                template: {
                                    name: params.template.name,
                                    language: { code: (_d = params.template.language) !== null && _d !== void 0 ? _d : 'en' },
                                    components: components.length ? components : undefined,
                                },
                            };
                        }
                        else if (params.type === 'image' && params.image) {
                            payload.whatsapp = {
                                type: 'image',
                                image: {
                                    link: params.image.url,
                                    caption: params.image.caption,
                                },
                            };
                        }
                        else if (params.type === 'interactive' && params.interactive) {
                            payload.whatsapp = {
                                type: 'interactive',
                                interactive: params.interactive,
                            };
                        }
                        else {
                            return [2 /*return*/, { success: false, error: 'Invalid params: provide text, template, image, or interactive' }];
                        }
                        return [4 /*yield*/, this.fetchWithRetry(this.path('messages'), {
                                method: 'POST',
                                body: JSON.stringify(payload),
                            })];
                    case 2:
                        result = _h.sent();
                        messageId = (_g = (_e = result === null || result === void 0 ? void 0 : result.id) !== null && _e !== void 0 ? _e : (_f = result === null || result === void 0 ? void 0 : result.data) === null || _f === void 0 ? void 0 : _f.id) !== null && _g !== void 0 ? _g : result === null || result === void 0 ? void 0 : result.messageId;
                        return [2 /*return*/, { success: true, messageId: messageId }];
                    case 3:
                        error_2 = _h.sent();
                        console.error('[Gallabox] sendMessage error:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Unknown error',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetch contacts from Gallabox.
     * Docs: GET /accounts/{accountId}/contacts
     */
    GallaboxService.prototype.getContacts = function () {
        return __awaiter(this, arguments, void 0, function (limit, offset) {
            var data, raw, contacts, error_3;
            var _a, _b, _c;
            if (limit === void 0) { limit = 500; }
            if (offset === void 0) { offset = 0; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.accountId) {
                            return [2 /*return*/, { success: false, contacts: [], error: 'Account ID is required' }];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.fetchWithRetry(this.path("contacts?limit=".concat(limit, "&skip=").concat(offset)))];
                    case 2:
                        data = _d.sent();
                        raw = Array.isArray(data) ? data : ((_b = (_a = data === null || data === void 0 ? void 0 : data.data) !== null && _a !== void 0 ? _a : data === null || data === void 0 ? void 0 : data.contacts) !== null && _b !== void 0 ? _b : []);
                        contacts = raw.map(function (c) {
                            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                            return ({
                                id: (_b = (_a = c._id) !== null && _a !== void 0 ? _a : c.id) !== null && _b !== void 0 ? _b : '',
                                name: (_c = c.name) !== null && _c !== void 0 ? _c : '',
                                phone: Array.isArray(c.phone) ? ((_d = c.phone[0]) !== null && _d !== void 0 ? _d : '') : ((_e = c.phone) !== null && _e !== void 0 ? _e : ''),
                                email: Array.isArray(c.email) ? ((_f = c.email[0]) !== null && _f !== void 0 ? _f : undefined) : ((_g = c.email) !== null && _g !== void 0 ? _g : undefined),
                                tags: (_j = (_h = c.tags) === null || _h === void 0 ? void 0 : _h.map(function (t) { return (typeof t === 'string' ? t : t.name); })) !== null && _j !== void 0 ? _j : [],
                            });
                        });
                        return [2 /*return*/, { success: true, contacts: contacts, total: (_c = data === null || data === void 0 ? void 0 : data.total) !== null && _c !== void 0 ? _c : contacts.length }];
                    case 3:
                        error_3 = _d.sent();
                        console.error('[Gallabox] getContacts error:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                contacts: [],
                                error: error_3 instanceof Error ? error_3.message : 'Unknown error',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Find a contact by phone number.
     * Docs: GET /accounts/{accountId}/contacts?phone={phone}
     */
    GallaboxService.prototype.findContactByPhone = function (phone) {
        return __awaiter(this, void 0, void 0, function () {
            var normalised, data, raw, c, _a;
            var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        if (!this.accountId)
                            return [2 /*return*/, null];
                        _o.label = 1;
                    case 1:
                        _o.trys.push([1, 3, , 4]);
                        normalised = phone.replace(/^\+/, '').replace(/\D/g, '');
                        return [4 /*yield*/, this.fetchWithRetry(this.path("contacts?phone=".concat(encodeURIComponent(normalised), "&limit=1")))];
                    case 2:
                        data = _o.sent();
                        raw = Array.isArray(data) ? data : ((_c = (_b = data === null || data === void 0 ? void 0 : data.data) !== null && _b !== void 0 ? _b : data === null || data === void 0 ? void 0 : data.contacts) !== null && _c !== void 0 ? _c : []);
                        if (!raw.length)
                            return [2 /*return*/, null];
                        c = raw[0];
                        return [2 /*return*/, {
                                id: (_e = (_d = c._id) !== null && _d !== void 0 ? _d : c.id) !== null && _e !== void 0 ? _e : '',
                                name: (_f = c.name) !== null && _f !== void 0 ? _f : '',
                                phone: Array.isArray(c.phone) ? ((_g = c.phone[0]) !== null && _g !== void 0 ? _g : normalised) : ((_h = c.phone) !== null && _h !== void 0 ? _h : normalised),
                                email: Array.isArray(c.email) ? ((_j = c.email[0]) !== null && _j !== void 0 ? _j : undefined) : ((_k = c.email) !== null && _k !== void 0 ? _k : undefined),
                                tags: (_m = (_l = c.tags) === null || _l === void 0 ? void 0 : _l.map(function (t) { return (typeof t === 'string' ? t : t.name); })) !== null && _m !== void 0 ? _m : [],
                            }];
                    case 3:
                        _a = _o.sent();
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a new contact in Gallabox.
     * Docs: POST /accounts/{accountId}/contacts
     */
    GallaboxService.prototype.createContact = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var phone, payload, result, contactId, error_4;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.accountId) {
                            return [2 /*return*/, { success: false, error: 'Account ID is required' }];
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        phone = params.phone.replace(/^\+/, '').replace(/\D/g, '');
                        payload = {
                            name: params.name,
                            phone: [phone],
                        };
                        if (params.email)
                            payload.email = [params.email];
                        if (params.company)
                            payload.company = params.company;
                        if (params.designation)
                            payload.designation = params.designation;
                        if (params.website)
                            payload.website = params.website;
                        if ((_a = params.tags) === null || _a === void 0 ? void 0 : _a.length)
                            payload.tags = params.tags;
                        return [4 /*yield*/, this.fetchWithRetry(this.path('contacts'), {
                                method: 'POST',
                                body: JSON.stringify(payload),
                            })];
                    case 2:
                        result = _g.sent();
                        contactId = (_e = (_c = (_b = result === null || result === void 0 ? void 0 : result._id) !== null && _b !== void 0 ? _b : result === null || result === void 0 ? void 0 : result.id) !== null && _c !== void 0 ? _c : (_d = result === null || result === void 0 ? void 0 : result.data) === null || _d === void 0 ? void 0 : _d._id) !== null && _e !== void 0 ? _e : (_f = result === null || result === void 0 ? void 0 : result.data) === null || _f === void 0 ? void 0 : _f.id;
                        return [2 /*return*/, { success: true, contactId: contactId }];
                    case 3:
                        error_4 = _g.sent();
                        console.error('[Gallabox] createContact error:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Unknown error',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update an existing contact.
     * Docs: PUT /accounts/{accountId}/contacts/{contactId}
     */
    GallaboxService.prototype.updateContact = function (contactId, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.accountId)
                            return [2 /*return*/, { success: false, error: 'Account ID is required' }];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        payload = {};
                        if (updates.name)
                            payload.name = updates.name;
                        if (updates.email)
                            payload.email = [updates.email];
                        if (updates.company)
                            payload.company = updates.company;
                        if (updates.designation)
                            payload.designation = updates.designation;
                        if (updates.website)
                            payload.website = updates.website;
                        if ((_a = updates.tags) === null || _a === void 0 ? void 0 : _a.length)
                            payload.tags = updates.tags;
                        return [4 /*yield*/, this.fetchWithRetry(this.path("contacts/".concat(contactId)), {
                                method: 'PUT',
                                body: JSON.stringify(payload),
                            })];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, { success: true }];
                    case 3:
                        error_5 = _b.sent();
                        return [2 /*return*/, {
                                success: false,
                                error: error_5 instanceof Error ? error_5.message : 'Unknown error',
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Upsert: find by phone → update if exists, create if not.
     */
    GallaboxService.prototype.upsertContact = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, res_1, res, error_6;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.findContactByPhone(params.phone)];
                    case 1:
                        existing = _d.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.updateContact(existing.id, params)];
                    case 2:
                        res_1 = _d.sent();
                        if (res_1.success)
                            return [2 /*return*/, { success: true, contactId: existing.id, action: 'updated' }];
                        return [2 /*return*/, { success: false, action: 'error', error: (_a = res_1.error) !== null && _a !== void 0 ? _a : undefined }];
                    case 3: return [4 /*yield*/, this.createContact(params)];
                    case 4:
                        res = _d.sent();
                        if (res.success)
                            return [2 /*return*/, { success: true, contactId: (_b = res.contactId) !== null && _b !== void 0 ? _b : undefined, action: 'created' }];
                        return [2 /*return*/, { success: false, action: 'error', error: (_c = res.error) !== null && _c !== void 0 ? _c : undefined }];
                    case 5:
                        error_6 = _d.sent();
                        return [2 /*return*/, {
                                success: false,
                                action: 'error',
                                error: error_6 instanceof Error ? error_6.message : 'Unknown error',
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return GallaboxService;
}());
exports.GallaboxService = GallaboxService;
// ── Factory & Singleton ───────────────────────────────────────────────────────
function createGallaboxService(overrides) {
    var _a, _b, _c, _d, _e, _f;
    var apiKey = (_b = (_a = overrides === null || overrides === void 0 ? void 0 : overrides.apiKey) !== null && _a !== void 0 ? _a : process.env.GALLABOX_API_KEY) !== null && _b !== void 0 ? _b : '';
    var apiSecret = (_d = (_c = overrides === null || overrides === void 0 ? void 0 : overrides.apiSecret) !== null && _c !== void 0 ? _c : process.env.GALLABOX_SECRET_API) !== null && _d !== void 0 ? _d : '';
    var accountId = (_f = (_e = overrides === null || overrides === void 0 ? void 0 : overrides.accountId) !== null && _e !== void 0 ? _e : process.env.GALLABOX_ACCOUNT_ID) !== null && _f !== void 0 ? _f : '';
    return new GallaboxService({ apiKey: apiKey, apiSecret: apiSecret, accountId: accountId });
}
var _instance = null;
/**
 * Returns a GallaboxService instance whose credentials are sourced from
 * `platform_credentials` (the encrypted store). Falls back to env vars if no
 * DB row exists, so the service keeps working without database setup.
 *
 * This is async because it may need to decrypt credentials from Supabase.
 */
function getGallaboxService() {
    return __awaiter(this, void 0, void 0, function () {
        var supabaseAdmin, decryptCredential, _a, data, error, plaintext;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (_instance)
                        return [2 /*return*/, _instance];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../../supabase/supabase'); })];
                case 1:
                    supabaseAdmin = (_e.sent()).supabaseAdmin;
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('../../credentials/crypto'); })];
                case 2:
                    decryptCredential = (_e.sent()).decryptCredential;
                    return [4 /*yield*/, supabaseAdmin
                            .from('platform_credentials')
                            .select('encrypted_payload, encrypted_dek, iv')
                            .eq('platform_name', 'gallabox')
                            .limit(1)
                            .maybeSingle()];
                case 3:
                    _a = _e.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        throw new GallaboxServiceError("Failed to load Gallabox credentials: ".concat(error.message));
                    }
                    if (!data) {
                        throw new GallaboxServiceError('Gallabox credentials not configured. Add them in Settings → Platform Credentials.');
                    }
                    return [4 /*yield*/, decryptCredential({
                            encryptedPayload: data.encrypted_payload,
                            encryptedDek: data.encrypted_dek,
                            iv: data.iv,
                        })];
                case 4:
                    plaintext = _e.sent();
                    _instance = new GallaboxService({
                        apiKey: (_b = plaintext['apiKey']) !== null && _b !== void 0 ? _b : '',
                        apiSecret: (_c = plaintext['apiSecret']) !== null && _c !== void 0 ? _c : '',
                        accountId: (_d = plaintext['accountId']) !== null && _d !== void 0 ? _d : '',
                    });
                    return [2 /*return*/, _instance];
            }
        });
    });
}
/** Call after updating credentials at runtime so the next call re-fetches from DB. */
function resetGallaboxService() {
    _instance = null;
}
