# ResQVision Test Samples Provenance

This directory contains three license-free evaluation images for verifying YOLO person detection and deterministic scene feature extraction:

1. `sample_people_crowd.jpg`: Standard Ultralytics public evaluation benchmark image (`bus.jpg`) depicting multiple individuals on an urban street. Used to verify multi-person detection, bounding box spatial clustering, coverage ratio, and quadrant distribution.
2. `sample_person_single.jpg`: Standard Ultralytics public evaluation benchmark image (`zidane.jpg`) depicting individuals in frame. Used to verify aspect ratio calculation, confidence thresholds, and single-subject metrics.
3. `sample_empty_landscape.jpg`: Aerial disaster terrain imagery derived from public satellite/aerial terrain assets depicting wildland/flood zone with zero human subjects. Used to verify the edge case of 0 detections returning an empty detection list, zero coverage ratio, and no false positives or exceptions.
