# ResQVision — 90-Second Live Demonstration Script & Protocol

This document provides the exact timed script, step-by-step presentation protocol, input files, and expected outputs for presenting ResQVision during the demo session.

---

## 1. Quick Reference & Demo Asset Manifest

| Phase | Input File | Verified Expected Output | Key Highlight |
| :--- | :--- | :--- | :--- |
| **Primary Demo** (30s–75s) | `data/samples/sample_person_single.jpg` | **2 persons detected**<br>&bull; `p1`: Conf 0.84, Aspect Ratio 1.95 (Flagged Horizontal)<br>&bull; Category: `possible_person_down`<br>&bull; Urgency: `MEDIUM`<br>&bull; Latency: ~20–35ms det | **Observed vs. Interpreted**:<br>Geometric w/h heuristic flagged; system explicitly states uncertainty rather than hallucinating medical diagnosis. |
| **Control Demo** (75s–90s) | `data/samples/sample_empty_landscape.jpg` *(or `sample_people_crowd.jpg`)* | **0 persons detected**<br>&bull; Category: `no_people`<br>&bull; Urgency: `LOW`<br>&bull; Latency: ~18–25ms det | **No False Alarm**:<br>Wildland/flood terrain produces zero false detections; zero hallucinations. |

---

## 2. 90-Second Timed Script

### Phase 1: The Problem (00:00 – 00:15) [15 Seconds]
> *"In emergency response and drone reconnaissance, operators receive flooded streams of visual data. Sending raw drone footage directly to multimodal vision-LLMs causes severe latency bottlenecks, hallucinatory medical claims, and phantom GPS coordinates that put first responders at risk."*

---

### Phase 2: What Makes ResQVision Different (00:15 – 00:30) [15 Seconds]
> *"ResQVision separates detection from reasoning. A local, lightweight YOLO nano model detects human subjects in under 30 milliseconds and computes deterministic spatial telemetry—aspect ratios, dispersion, and quadrant distribution.*
>
> *Crucially: **the reasoning model never receives raw image pixels.** It reasons strictly over verified, auditable mathematical evidence. And 2D bounding boxes never fabricate real-world geographic coordinates."*

---

### Phase 3: Live Upload & Evidentiary Walkthrough (00:30 – 01:15) [45 Seconds]
*(Action: Drag and drop `data/samples/sample_person_single.jpg` into the Analyze upload dropzone and click **Analyze Incident**)*

> *"Watch the live triage pipeline. In under 30 milliseconds, the detector processes the frame:*
>
> 1. ***Observed Evidence (Left Panel)***: *We see 2 detected individuals. Subject `p1` has a width-to-height aspect ratio of 1.95—well above our 1.2 horizontal threshold. Subject `p2` is upright with an aspect ratio of 0.59.*
> 2. ***Clickable Evidence Chips***: *Clicking on the `p1 (Aspect: 1.95)` chip immediately highlights the exact subject on the canvas.*
> 3. ***Interpreted Assessment (Right Panel)***: *The reasoning engine classifies this as `possible_person_down` with `MEDIUM` urgency. Notice the transparency: every rationale bullet cites the exact evidence token, and the warnings specifically remind the operator that horizontal posture is a geometric bounding-box heuristic, not clinical confirmation of injury.*
> 4. ***Honest Provenance***: *The footer displays the exact pipeline timing and model provenance."*

---

### Phase 4: Control Verification & Honest Limitations (01:15 – 01:30) [15 Seconds]
*(Action: Clear and drop `data/samples/sample_empty_landscape.jpg`, or switch to Incidents log)*

> *"To prove resistance to false alarms, we run an aerial disaster terrain control with zero humans. The system cleanly returns `0 persons`, category `no_people`, and `LOW` urgency without hallucinating distress.*
>
> *Our honest limitations: 2D bounding boxes can be fooled by low camera angles or crouching subjects, and occluded subjects in rubble require specialized thermal sensors. ResQVision is designed to augment human commanders with explainable evidence, not replace field judgment."*

---

## 3. Step-by-Step Operator Runbook

### Pre-Demo Checklist (5 Minutes Before)
1. Ensure services are running:
   ```bash
   ./scripts/dev.sh
   ```
2. Verify Backend Status indicator in top-right header shows green: **"Backend: Reachable"**.
3. Open browser at `http://localhost:3000/analyze` (or navigate via "Launch ResQVision" from `http://localhost:3000`).
4. Have the demo images readily accessible in Finder / File Picker:
   - File 1: `data/samples/sample_person_single.jpg`
   - File 2: `data/samples/sample_empty_landscape.jpg`
5. Optional fallback: If external Groq API latency spikes or WiFi is degraded, ResQVision seamlessly falls back to the deterministic local rule engine within 1ms, clearly labeled as `rules_fallback`.

---

## 4. Truthful Known Limitations

1. **2D Aspect Ratio Heuristic vs. True 3D Posture**:
   A subject lying prone photographed from directly above (nadir drone view) can appear circular or square ($w/h \approx 1.0$), while a person doing a push-up or sitting cross-legged may trigger $w/h \ge 1.2$.
2. **Camera Angle & Perspective Distortion**:
   Steep oblique angles distort apparent bounding box dimensions relative to ground truth.
3. **Severe Visual Occlusion**:
   In disaster rubble, smoke, or dense forest canopies, optical RGB detection is bounded by line of sight. Thermal or multispectral imaging would be required for heavily occluded victims.
4. **No Real-Time Geolocation Without Telemetry**:
   Detection bounding boxes exist solely in pixel coordinate space $([0, 1] \times [0, 1])$. They cannot be projected onto real-world maps unless the drone camera metadata (sensor size, focal length, altitude, heading, and gimbal pitch) is supplied.
