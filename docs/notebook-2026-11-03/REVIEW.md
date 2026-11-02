# Independent review closeout

Reviewer: `/root/independent_review`, separate from the builder, 3November2026.

The review initially blocked release on concrete security and task-geometry defects. They were repaired before shipping:

- Account/cookie switches during asynchronous backup could target the wrong account. Each operation now captures the displayed account and the server enforces that identity.
- Stale cloud deletes/publishes and separate revision reads could approve unseen versions. CAS writes return their revision atomically; deletes and publishes are version-guarded.
- A share could reread an unreviewed local edit. Publication uses the immutable preview snapshot.
- Account-deletion races could recreate orphan data. Ownership FKs/cascades plus a held-auth request test prove containment.
- Local get/put metadata operations could overwrite edits/resurrect deletion. IndexedDB read-write mutations are atomic and fail for deleted records. Cloud deletion clears the local cloud link.
- JPEG metadata after a scan could survive early parsing. The full marker walk strips metadata both before and after scans and rejects trailing/unsupported data.
- Legacy ISO dates shifted in cloud backup/edit, and date-only rendering varied by viewer zone. Bangkok normalization and explicit display timezone preserve the visit day; impossible dates reject.
- Device-clear controls depended on cloud authentication returning. Local controls mount immediately and API calls have a12-second deadline.
- Moderator photos were not inspectable and hidden posts had no keep-visible path. Queue thumbnails/reasons, restore visibility and removal now work.
- Bulk contribution export could allocate all photo payloads at once. Metadata lists are bounded, snapshots fetched individually, and the client builds Blob parts.
- Utility disclosures displaced first-entry actions. Entries now precede secondary tools; first-action bottoms493px on phone and469px at1024/1440/1280. The restored utility chain fails the600px budget.
- Ungiven ratings no longer display as0/5. Existing visitor scores have an unavailable/loading state.

The reviewer independently refreshed source, checked syntax and ran the deterministic race/JPEG/date/FK tests. Updated phone/tablet/desktop and enlarged-text captures close the spatial finding. Final verdict: no remaining blockers in reviewed source; final functional reruns and production verification remain the release owner's responsibility.

Builder follow-through additionally exercises active/closed draft preservation, successful save, moderation photos, cloud-delete/rebackup, export and finder/hop/mood preservation. Those results and live proof are recorded separately.
