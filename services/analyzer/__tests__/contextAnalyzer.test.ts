import { analyzeContext } from '../contextAnalyzer';

test('detects SSN => strict privacy', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'my ssn is 123-45-6789'}] });
  expect(r.requiresPrivacy).toBe(true);
  expect(r.privacyLevel).toBe('strict');
  expect(r.detectedDomains).toContain('personal');
});

test('detects code without keywords', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'```ts\nexport const x=1\n```'}] });
  expect(r.type).toBe('code_generation');
});

test('detects data from CSV', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'name,age,score\nAlice,33,98'}] });
  expect(r.type).toBe('data_analysis');
});

test('tool escalator bumps complexity', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'short task'}], tools:['browser'] });
  expect(r.complexity).toBe('medium'); // low → medium
});

test('tokens are separated input/output', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'hello world'}] });
  expect(r.expectedInputTokens).toBeGreaterThan(0);
  expect(r.expectedOutputTokens).toBeGreaterThan(0);
});

test('time constraint realtime', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'urgent please do it in 5 min'}] });
  expect(r.timeConstraint).toBe('realtime');
});

test('detects medical domain', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'patient diagnosis hipaa phi'}] });
  expect(r.detectedDomains).toContain('medical');
  expect(r.privacyLevel).toBe('moderate');
});

test('detects financial domain', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'bank account routing number'}] });
  expect(r.detectedDomains).toContain('financial');
});

test('detects email pattern', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'contact me at user@example.com'}] });
  expect(r.detectedDomains).toContain('personal');
  expect(r.requiresPrivacy).toBe(true);
});

test('detects phone number', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'call me at (555) 123-4567'}] });
  expect(r.detectedDomains).toContain('personal');
});

test('detects complex reasoning', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'first step is to analyze the data, second step is to create a report, finally we need to present findings'}] });
  expect(r.type).toBe('complex_reasoning');
});

test('detects statistical analysis', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'run regression analysis with p-value significance'}] });
  expect(r.type).toBe('data_analysis');
});

test('detects batch time constraint', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'create a comprehensive report with deep dive analysis'}] });
  expect(r.timeConstraint).toBe('batch');
});

test('confidence calculation', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'complex code generation task'}] });
  expect(r.confidence).toBeGreaterThan(0.6);
});

test('reasons array contains non-PII cues', () => {
  const r = analyzeContext({ messages:[{role:'user',content:'```python\nprint("hello")\n```'}] });
  expect(r.reasons).toContain('code block detected');
});

test('handles large text input', () => {
  const largeText = 'a'.repeat(300_000);
  const r = analyzeContext({ messages:[{role:'user',content:largeText}] });
  expect(r.expectedInputTokens).toBeGreaterThan(0);
  expect(r.expectedOutputTokens).toBeGreaterThan(0);
});

test('strict privacy mode', () => {
  const r = analyzeContext({ 
    messages:[{role:'user',content:'simple query'}], 
    privacyMode: 'strict' 
  });
  expect(r.privacyLevel).toBe('strict');
});

test('balanced privacy mode', () => {
  const r = analyzeContext({ 
    messages:[{role:'user',content:'simple query'}], 
    privacyMode: 'balanced' 
  });
  expect(r.privacyLevel).toBe('relaxed');
});
