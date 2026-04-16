# Utils Directory

This directory contains utility functions that are pure and reusable across the application.

## Overview

Utilities are pure functions that don't depend on React or browser state. They can be easily tested in isolation.

## Files

| File | Purpose | Lines | Tests |
|------|---------|-------|-------|
| `audioProcessor.ts` | Audio waveform extraction and formatting | 73 | 11 tests |
| `workspaceExport.ts` | Versioned workspace export serialization and JSON download helpers | ~130 | 4 tests |
| `audioProcessor.test.ts` | Unit tests for audioProcessor | 149 | - |
| `workspaceExport.test.ts` | Unit tests for workspace export helpers | ~190 | - |

## Detailed Documentation

### audioProcessor.ts

**Purpose**: Process audio files to extract waveform data for visualization.

**⚠️ IMPORTANT**: Contains both pure and impure functions. Pure functions are easily testable without browser APIs.

**Functions**:

#### extractWaveformFromChannelData(channelData, numBars)

**Purpose**: Extract normalized waveform data from audio samples.

**Signature**:
```typescript
function extractWaveformFromChannelData(
  channelData: Float32Array,
  numBars: number = 50
): number[]
```

**Parameters**:
- `channelData`: Audio sample data (-1.0 to 1.0 amplitude)
- `numBars`: Number of waveform bars to generate (default: 50)

**Returns**: Array of normalized amplitudes (0.0 to 1.0)

**Algorithm**:
1. Divide channel data into `numBars` segments
2. For each segment, find the maximum absolute amplitude
3. Normalize all amplitudes to 0-1 range based on global max
4. Ensure minimum amplitude of 0.1 for visibility

**Implementation**:
```typescript
const samplesPerBar = Math.floor(channelData.length / numBars);
const amplitudes: number[] = [];

// Find max amplitude in each segment
for (let i = 0; i < numBars; i++) {
  const start = i * samplesPerBar;
  const end = start + samplesPerBar;
  let maxAmp = 0;
  
  for (let j = start; j < end; j++) {
    maxAmp = Math.max(maxAmp, Math.abs(channelData[j]));
  }
  
  amplitudes.push(maxAmp);
}

// Normalize
const maxAmplitude = Math.max(...amplitudes);
return maxAmplitudes > 0
  ? amplitudes.map((amp) => Math.max(0.1, amp / maxAmplitude))
  : amplitudes.map(() => 0.1);
```

**Pure Function**: Yes! No side effects, same input → same output.

**Success Criteria**:
- [ ] Returns array of correct length
- [ ] All values between 0.1 and 1.0
- [ ] Handles silent audio (all zeros)
- [ ] Handles varying amplitudes
- [ ] Normalizes correctly

**Constraints**:
- Requires Float32Array input
- Minimum amplitude forced to 0.1 (for visibility)
- Synchronous (blocking for large audio files)

---

#### extractWaveform(audioSrc, numBars)

**Purpose**: Fetch and decode audio file, then extract waveform.

**Signature**:
```typescript
async function extractWaveform(
  audioSrc: string,
  numBars: number = 50
): Promise<{ waveform: number[]; duration: number }>
```

**Parameters**:
- `audioSrc`: URL or base64 data URL of audio file
- `numBars`: Number of waveform bars (default: 50)

**Returns**: Promise resolving to waveform data and duration

**Browser APIs Used**:
- `fetch()`: Download audio file
- `AudioContext`: Decode audio data
- `FileReader`: Read base64 data

**Algorithm**:
1. Detect if src is URL or base64
2. Fetch/load audio data as ArrayBuffer
3. Create AudioContext and decode audio
4. Extract first channel data
5. Process with `extractWaveformFromChannelData()`
6. Return waveform + duration

**Impure Function**: Yes! Uses browser APIs, network requests, has side effects.

**Error Handling**:
- Throws if fetch fails
- Throws if audio decode fails
- Throws if no audio data

**Success Criteria**:
- [ ] Handles HTTP URLs
- [ ] Handles base64 data URLs
- [ ] Returns correct duration
- [ ] Returns normalized waveform
- [ ] Throws on invalid audio

**Constraints**:
- Requires browser environment
- AudioContext may be blocked until user interaction
- CORS issues with external URLs
- Large files may take time to decode

**Known Issues**:
1. **AudioContext Autoplay Policy**: May fail if called before user interaction
   ```typescript
   // Solution: Call after user gesture
   button.addEventListener('click', async () => {
     const data = await extractWaveform(url);
   });
   ```

2. **Memory Usage**: Decodes entire audio file into memory. Large files could cause issues.

3. **No Progress Callback**: Long operations block without progress indication.

---

#### formatDuration(seconds)

**Purpose**: Format seconds as "M:SS" string.

**Signature**:
```typescript
function formatDuration(seconds: number): string
```

**Parameters**:
- `seconds`: Duration in seconds

**Returns**: Formatted string (e.g., "3:45")

**Examples**:
```typescript
formatDuration(0)      // "0:00"
formatDuration(45)     // "0:45"
formatDuration(125)    // "2:05"
formatDuration(3600)   // "60:00"
```

**Implementation**:
```typescript
const minutes = Math.floor(seconds / 60);
const secs = Math.floor(seconds % 60);
return `${minutes}:${secs.toString().padStart(2, '0')}`;
```

**Pure Function**: Yes!

**Success Criteria**:
- [ ] Handles 0 seconds
- [ ] Handles large durations
- [ ] Always two-digit seconds
- [ ] No rounding issues

**Constraints**:
- Floors seconds (truncates decimals)
- Does not handle hours (shows "90:00" not "1:30:00")

---

### workspaceExport.ts

**Purpose**: Serialize the active workspace into a versioned JSON export format that stays stable even if the internal Zustand store evolves.

**Export Contract**:
- Format id: `tldraw-workspace-export`
- Version: `1`
- Includes workspace metadata, camera state, ordered nodes, and root node ids
- Preserves grouping through both `parentId` and `childrenIds`
- Preserves layer order through the exported node array and `zIndex`
- Excludes transient runtime-only state such as:
  - dragging/drawing flags
  - current selection
  - text editing state
  - audio playback state

**Functions**:

#### serializeWorkspaceForExport(workspace)

**Purpose**: Convert a persisted workspace into `WorkspaceExportDocumentV1`.

**Behavior**:
- Copies shape/style data defensively so the export payload is detached from live state
- Normalizes missing `parentId` values to `null`
- Emits root nodes separately for consumers that want a direct hierarchy entry point
- Supports nested groups without flattening them away

#### createWorkspaceExportFilename(workspaceName, date)

**Purpose**: Generate a filesystem-safe JSON filename for downloads.

**Behavior**:
- Lowercases and slugifies the workspace name
- Appends an ISO timestamp with colon-safe characters
- Falls back to `workspace-...json` when the workspace name is blank after sanitization

#### downloadWorkspaceExport(exportDocument, filename)

**Purpose**: Download the serialized document as a pretty-printed JSON file in the browser.

**Implementation Notes**:
- Uses `Blob`
- Uses `URL.createObjectURL()` / `URL.revokeObjectURL()`
- Creates a temporary anchor element and triggers `click()`

**Success Criteria**:
- [ ] Exported JSON includes format/version metadata
- [ ] Grouped shapes retain hierarchy and child ordering
- [ ] Layer order is preserved in the exported node list
- [ ] Downloaded file uses a deterministic, safe filename shape

---

## Testing

Comprehensive test suites cover:

1. **formatDuration**:
   - Zero seconds
   - Less than one minute
   - More than one minute
   - Exactly one minute

2. **extractWaveformFromChannelData**:
   - Uniform data (same amplitude)
   - Varying amplitudes
   - All zeros (silent)
   - Negative values (audio oscillates)
   - Correct number of bars
   - Normalization range

3. **workspaceExport**:
   - Versioned document metadata
   - Group hierarchy preservation
   - Layer-order preservation
   - Filename sanitization
   - Browser download payload generation

**Test Philosophy**:
- Test pure functions extensively
- Mock browser APIs for impure functions
- Test edge cases (zeros, negatives, boundaries)
- No integration tests (pure unit tests)

**Example Test**:
```typescript
it('should normalize varying amplitudes correctly', () => {
  const channelData = new Float32Array([
    0.1, 0.1, 0.1, 0.1, 0.1,
    0.5, 0.5, 0.5, 0.5, 0.5,
  ]);
  
  const result = extractWaveformFromChannelData(channelData, 2);
  
  expect(result).toHaveLength(2);
  expect(result[0]).toBeGreaterThan(0.1);
  expect(result[0]).toBeLessThan(result[1]);
  expect(result[1]).toBe(1.0);  // Max normalized to 1.0
});
```

**Run Tests**:
```bash
npm test -- audioProcessor
```

## Pure vs Impure Functions

| Function | Pure | Notes |
|----------|------|-------|
| `extractWaveformFromChannelData` | ✅ | No side effects, deterministic |
| `formatDuration` | ✅ | Mathematical calculation only |
| `extractWaveform` | ❌ | Uses fetch, AudioContext, FileReader |

**Best Practice**: Separate pure logic from impure I/O.

```typescript
// Bad: Everything in one function
export async function processAudio(audioSrc: string) {
  const response = await fetch(audioSrc);        // Impure
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new AudioContext();       // Impure
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  
  // This part is pure but hard to test
  const samplesPerBar = Math.floor(channelData.length / 50);
  // ... processing logic
}

// Good: Separate pure logic
export function processAudioData(channelData: Float32Array) {
  // Pure, easily testable
  return extractWaveformFromChannelData(channelData, 50);
}

export async function processAudio(audioSrc: string) {
  // Impure I/O wrapper
  const channelData = await loadAudioData(audioSrc);
  return processAudioData(channelData);
}
```

## Usage Examples

### Extract Waveform from URL
```typescript
import { extractWaveform } from './utils/audioProcessor';

try {
  const { waveform, duration } = await extractWaveform('/audio/song.mp3');
  console.log(`Duration: ${duration}s`);
  console.log(`Waveform bars: ${waveform.length}`);
} catch (error) {
  console.error('Failed to extract waveform:', error);
}
```

### Extract Waveform from Base64
```typescript
const base64Audio = 'data:audio/mp3;base64,//uQxAAAAAA...';
const { waveform, duration } = await extractWaveform(base64Audio);
```

### Process Channel Data Directly
```typescript
import { extractWaveformFromChannelData } from './utils/audioProcessor';

// If you already have AudioBuffer
const channelData = audioBuffer.getChannelData(0);
const waveform = extractWaveformFromChannelData(channelData, 100);
```

### Format Duration
```typescript
import { formatDuration } from './utils/audioProcessor';

const durationText = formatDuration(185);  // "3:05"
```

## Adding New Utilities

When adding new utility functions:

1. **Prefer pure functions**: Easier to test, reason about, and reuse
2. **Separate I/O**: If function needs browser APIs, separate pure logic
3. **Add tests**: Every utility should have comprehensive tests
4. **Document**: Add JSDoc comments with examples
5. **Type strictly**: Use TypeScript types, avoid `any`

## Best Practices

1. **Single Responsibility**: Each function does one thing
2. **Pure Functions**: No side effects, same input → same output
3. **Immutable**: Don't mutate inputs
4. **Well-Typed**: Use TypeScript strictly
5. **Tested**: 100% coverage for pure functions
6. **Documented**: Clear JSDoc with examples

## Future Utilities

Potential additions:
- `imageProcessor.ts`: Image resizing, format conversion
- `colorUtils.ts`: Color manipulation, contrast calculation
- `mathUtils.ts`: Geometric calculations, interpolation
- `stringUtils.ts`: String formatting, sanitization
- `validation.ts`: Input validation functions

## Success Criteria

- [ ] All utility functions pure (where possible)
- [ ] Impure functions separated from pure logic
- [ ] 100% test coverage for pure functions
- [ ] Clear documentation with examples
- [ ] No dependencies on React or component state
- [ ] Tree-shakeable exports

## Constraints

- Must work in browser environment
- Avoid large dependencies
- Keep functions small and focused
- Don't depend on application state

## Known Issues

None currently.
