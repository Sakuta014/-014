import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin} from '../origin.mjs';
test('公网来源按固定域名校验，不能伪造 Host 或 Origin',()=>{assert.ok(sameOrigin('mai.sakuta.work','https://mai.sakuta.work','https://mai.sakuta.work'));assert.ok(!sameOrigin('mai.sakuta.work','https://evil.example','https://mai.sakuta.work'));assert.ok(!sameOrigin('evil.example','https://mai.sakuta.work','https://mai.sakuta.work'));assert.ok(!sameOrigin('mai.sakuta.work','http://mai.sakuta.work','https://mai.sakuta.work'));});
