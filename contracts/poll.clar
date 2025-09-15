(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-OPTIONS u101)
(define-constant ERR-INVALID-DURATION u102)
(define-constant ERR-INVALID-QUORUM u103)
(define-constant ERR-INVALID-VOTING-TYPE u104)
(define-constant ERR-INVALID-ANONYMITY u105)
(define-constant ERR-POLL-ALREADY-EXISTS u106)
(define-constant ERR-POLL-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-STAKE u110)
(define-constant ERR-INVALID-MAX-VOTES u111)
(define-constant ERR-POLL-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-POLLS-EXCEEDED u114)
(define-constant ERR-INVALID-POLL-TYPE u115)
(define-constant ERR-INVALID-REWARD-RATE u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CATEGORY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-constant ERR-POLL-ENDED u121)
(define-constant ERR-POLL-NOT-STARTED u122)
(define-constant ERR-ALREADY-VOTED u123)
(define-constant ERR-INVALID-COMMITMENT u124)
(define-constant ERR-INVALID-REVEAL u125)
(define-constant ERR-INVALID-OPTION u126)
(define-constant ERR-ANOMALY-DETECTED u127)
(define-constant ERR-INVALID-VOTER u128)
(define-constant ERR-QUORUM-NOT-MET u129)
(define-constant ERR-INVALID-REWARD u130)

(define-data-var next-poll-id uint u0)
(define-data-var max-polls uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)

(define-map polls
  uint
  {
    title: (string-utf8 100),
    options: (list 10 (string-utf8 50)),
    duration: uint,
    quorum: uint,
    voting-type: (string-utf8 20),
    anonymity: bool,
    timestamp: uint,
    creator: principal,
    poll-type: (string-utf8 50),
    reward-rate: uint,
    grace-period: uint,
    location: (string-utf8 100),
    category: (string-utf8 20),
    status: bool,
    min-stake: uint,
    max-votes: uint,
    start-block: uint,
    end-block: uint
  }
)

(define-map polls-by-title
  (string-utf8 100)
  uint)

(define-map poll-updates
  uint
  {
    update-title: (string-utf8 100),
    update-duration: uint,
    update-quorum: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-map commitments
  {poll-id: uint, voter: principal}
  (buff 32))

(define-map votes
  {poll-id: uint, voter: principal}
  uint)

(define-map vote-counts
  {poll-id: uint, option: uint}
  uint)

(define-map anomaly-flags
  {poll-id: uint}
  bool)

(define-read-only (get-poll (id uint))
  (map-get? polls id)
)

(define-read-only (get-poll-updates (id uint))
  (map-get? poll-updates id)
)

(define-read-only (is-poll-registered (title (string-utf8 100)))
  (is-some (map-get? polls-by-title title))
)

(define-read-only (get-commitment (poll-id uint) (voter principal))
  (map-get? commitments {poll-id: poll-id, voter: voter})
)

(define-read-only (get-vote (poll-id uint) (voter principal))
  (map-get? votes {poll-id: poll-id, voter: voter})
)

(define-read-only (get-vote-count (poll-id uint) (option uint))
  (default-to u0 (map-get? vote-counts {poll-id: poll-id, option: option}))
)

(define-read-only (get-anomaly-flag (poll-id uint))
  (default-to false (map-get? anomaly-flags {poll-id: poll-id}))
)

(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)

(define-private (validate-options (options (list 10 (string-utf8 50))))
  (if (and (> (len options) u1) (<= (len options) u10))
      (ok true)
      (err ERR-INVALID-OPTIONS))
)

(define-private (validate-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-quorum (quorum uint))
  (if (and (> quorum u0) (<= quorum u100))
      (ok true)
      (err ERR-INVALID-QUORUM))
)

(define-private (validate-voting-type (vtype (string-utf8 20)))
  (if (or (is-eq vtype "single") (is-eq vtype "multiple"))
      (ok true)
      (err ERR-INVALID-VOTING-TYPE))
)

(define-private (validate-anonymity (anon bool))
  (ok true)
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-poll-type (ptype (string-utf8 50)))
  (if (or (is-eq ptype "governance") (is-eq ptype "survey") (is-eq ptype "election"))
      (ok true)
      (err ERR-INVALID-POLL-TYPE))
)

(define-private (validate-reward-rate (rate uint))
  (if (<= rate u20)
      (ok true)
      (err ERR-INVALID-REWARD-RATE))
)

(define-private (validate-grace-period (period uint))
  (if (<= period u30)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-category (cat (string-utf8 20)))
  (if (or (is-eq cat "dao") (is-eq cat "community") (is-eq cat "corporate"))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-min-stake (min uint))
  (if (>= min u0)
      (ok true)
      (err ERR-INVALID-MIN_STAKE))
)

(define-private (validate-max-votes (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX_VOTES))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-private (validate-option-index (poll-id uint) (option uint))
  (let ((poll (unwrap! (get-poll poll-id) (err ERR_POLL-NOT-FOUND))))
    (if (< option (len (get options poll)))
        (ok true)
        (err ERR-INVALID_OPTION)))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-polls (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR_MAX-POLLS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-polls new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-poll
  (title (string-utf8 100))
  (options (list 10 (string-utf8 50)))
  (duration uint)
  (quorum uint)
  (voting-type (string-utf8 20))
  (anonymity bool)
  (poll-type (string-utf8 50))
  (reward-rate uint)
  (grace-period uint)
  (location (string-utf8 100))
  (category (string-utf8 20))
  (min-stake uint)
  (max-votes uint)
)
  (let (
        (next-id (var-get next-poll-id))
        (current-max (var-get max-polls))
        (authority (var-get authority-contract))
        (start (block-height))
        (end (+ start duration))
      )
    (asserts! (< next-id current-max) (err ERR_MAX-POLLS-EXCEEDED))
    (try! (validate-title title))
    (try! (validate-options options))
    (try! (validate-duration duration))
    (try! (validate-quorum quorum))
    (try! (validate-voting-type voting-type))
    (try! (validate-anonymity anonymity))
    (try! (validate-poll-type poll-type))
    (try! (validate-reward-rate reward-rate))
    (try! (validate-grace-period grace-period))
    (try! (validate-location location))
    (try! (validate-category category))
    (try! (validate-min-stake min-stake))
    (try! (validate-max-votes max-votes))
    (asserts! (is-none (map-get? polls-by-title title)) (err ERR_POLL-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set polls next-id
      {
        title: title,
        options: options,
        duration: duration,
        quorum: quorum,
        voting-type: voting-type,
        anonymity: anonymity,
        timestamp: start,
        creator: tx-sender,
        poll-type: poll-type,
        reward-rate: reward-rate,
        grace-period: grace-period,
        location: location,
        category: category,
        status: true,
        min-stake: min-stake,
        max-votes: max-votes,
        start-block: start,
        end-block: end
      }
    )
    (map-set polls-by-title title next-id)
    (var-set next-poll-id (+ next-id u1))
    (print { event: "poll-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-poll
  (poll-id uint)
  (update-title (string-utf8 100))
  (update-duration uint)
  (update-quorum uint)
)
  (let ((poll (map-get? polls poll-id)))
    (match poll
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (get status p) (err ERR-INVALID_STATUS))
          (try! (validate-title update-title))
          (try! (validate-duration update-duration))
          (try! (validate-quorum update-quorum))
          (let ((existing (map-get? polls-by-title update-title)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id poll-id) (err ERR_POLL-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-title (get title p)))
            (if (is-eq old-title update-title)
                (ok true)
                (begin
                  (map-delete polls-by-title old-title)
                  (map-set polls-by-title update-title poll-id)
                  (ok true)
                )
            )
          )
          (let ((new-end (+ (get start-block p) update-duration)))
            (map-set polls poll-id
              (merge p
                {
                  title: update-title,
                  duration: update-duration,
                  quorum: update-quorum,
                  timestamp: block-height,
                  end-block: new-end
                }
              )
            )
          )
          (map-set poll-updates poll-id
            {
              update-title: update-title,
              update-duration: update-duration,
              update-quorum: update-quorum,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "poll-updated", id: poll-id })
          (ok true)
        )
      (err ERR_POLL-NOT-FOUND)
    )
  )
)

(define-public (cast-vote (poll-id uint) (commitment (buff 32)))
  (let (
        (caller tx-sender)
        (current-block block-height)
        (poll (unwrap! (get-poll poll-id) (err ERR_POLL-NOT-FOUND)))
      )
    (asserts! (>= current-block (get start-block poll)) (err ERR_POLL-NOT-STARTED))
    (asserts! (< current-block (get end-block poll)) (err ERR_POLL-ENDED))
    (asserts! (is-none (get-commitment poll-id caller)) (err ERR_ALREADY_VOTED))
    (asserts! (is-none (get-vote poll-id caller)) (err ERR_ALREADY_VOTED))
    (try! (stx-transfer? (get min-stake poll) caller (unwrap! (var-get authority-contract) (err ERR_AUTHORITY-NOT-VERIFIED))))
    (map-set commitments {poll-id: poll-id, voter: caller} commitment)
    (try! (check-anomaly poll-id))
    (print { event: "vote-cast", poll-id: poll-id, voter: caller })
    (ok true)
  )
)

(define-public (reveal-vote (poll-id uint) (option uint) (salt (buff 32)))
  (let (
        (caller tx-sender)
        (poll (unwrap! (get-poll poll-id) (err ERR_POLL-NOT-FOUND)))
        (commitment (unwrap! (get-commitment poll-id caller) (err ERR_INVALID_COMMITMENT)))
        (expected (sha256 (concat (as-buff? option) salt)))
      )
    (asserts! (> block-height (get end-block poll)) (err ERR_POLL-ENDED))
    (asserts! (is-eq commitment expected) (err ERR_INVALID_REVEAL))
    (try! (validate-option-index poll-id option))
    (map-set votes {poll-id: poll-id, voter: caller} option)
    (map-delete commitments {poll-id: poll-id, voter: caller})
    (map-set vote-counts {poll-id: poll-id, option: option} (+ u1 (get-vote-count poll-id option)))
    (print { event: "vote-revealed", poll-id: poll-id, voter: caller, option: option })
    (ok true)
  )
)

(define-private (check-anomaly (poll-id uint))
  (let (
        (poll (unwrap! (get-poll poll-id) (err ERR_POLL-NOT-FOUND)))
        (total-votes (fold + (map get-vote-count (list poll-id) (range 0 (len (get options poll)))) u0))
      )
    (if (> total-votes (get max-votes poll))
        (begin
          (map-set anomaly-flags {poll-id: poll-id} true)
          (print { event: "anomaly-detected", poll-id: poll-id })
          (err ERR_ANOMALY-DETECTED)
        )
        (ok false)
      )
  )
)

(define-public (finalize-poll (poll-id uint))
  (let (
        (poll (unwrap! (get-poll poll-id) (err ERR_POLL-NOT-FOUND)))
        (current-block block-height)
        (total-votes (fold + (map get-vote-count (list poll-id) (range 0 (len (get options poll)))) u0))
      )
    (asserts! (>= current-block (+ (get end-block poll) (get grace-period poll))) (err ERR_POLL-ENDED))
    (if (< total-votes (get quorum poll))
        (begin
          (map-set polls poll-id (merge poll { status: false }))
          (err ERR_QUORUM_NOT_MET)
        )
        (begin
          (map-set polls poll-id (merge poll { status: false }))
          (print { event: "poll-finalized", poll-id: poll-id, total-votes: total-votes })
          (ok true)
        )
      )
  )
)

(define-public (get-poll-count)
  (ok (var-get next-poll-id))
)

(define-public (check-poll-existence (title (string-utf8 100)))
  (ok (is-poll-registered title))
)

(define-private (range (start uint) (end uint))
  (if (>= start end)
      (list )
      (cons start (range (+ start u1) end)))
)