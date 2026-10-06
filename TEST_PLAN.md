# TEST_PLAN

## Cases (each pair shares its frame and carries opposite labels; term `bank`, declared sense: the land along a river)

| Case | Sentence | Expected |
|---|---|---|
| R1 | We sat on the bank and watched the boats drift past. | RIGHT_SENSE |
| R2 | The heron stood very still on the muddy bank. | RIGHT_SENSE |
| R3 | After the flood, the bank was covered in broken branches. | RIGHT_SENSE |
| R4 | She tied the canoe to a willow on the far bank. | RIGHT_SENSE |
| R5 | Kids slid down the grassy bank into the shallow water. | RIGHT_SENSE |
| O1 | We sat in the bank and watched the clerks count notes. | OTHER_SENSE |
| O2 | The heron logo stood out on the bank's new card. | OTHER_SENSE |
| O3 | After the crash, the bank was covered in angry headlines. | OTHER_SENSE |
| O4 | She tied her savings to a fund at the bank on Main Street. | OTHER_SENSE |
| O5 | Kids saved coins in a plastic bank shaped like a pig. | OTHER_SENSE |

- **Kill tests:** R1/O1 … R5/O5 — the rubric does not hint at the mechanism.
- **Sense swap:** on a card declaring the money sense, R3 and O3 swap labels — the outcome depends on the declared sense.
- `WORDSENSE_KILLSET_CHECK.py` proves no word or word pair separates the classes, and that the rubric shares no content
  word with any case.

## Deterministic behaviour → test (`tests/contract/test_wordsense.py`, Direct Mode, model mocked)

| Behaviour | Test |
|---|---|
| The tooth: the same sentence flips with the declared sense | `test_tooth_same_sentence_flips_with_the_declared_sense`, `test_same_frame_other_sentence_flips_the_other_way` |
| The schedule | `test_new_card_has_interval_one_and_is_due_today`, `test_right_doubles_up_to_the_cap_of_32`, `test_other_sense_collapses_the_interval_to_one`, `test_card_is_due_exactly_on_its_due_day`, `test_late_practice_counts_from_the_day_it_happens` |
| The whole-word term check runs before the model | `test_uses_term_whole_word_rules`, `test_uses_term_multi_word_terms`, `test_term_check_runs_before_the_model` |
| One use per sentence per card | `test_sentence_variants_are_the_same_sentence`, `test_same_sentence_allowed_on_another_card` |
| Ids and roles | `test_two_wallets_with_identical_cards_get_two_ids`, `test_whitespace_variants_share_one_card_id`, `test_third_wallet_is_refused_by_every_write` |
| Day arithmetic | `test_today_matches_python_date_arithmetic` |
| Fail-safe and validator | `test_fail_safe_on_unparseable_output`, `test_fail_safe_on_unknown_label`, `test_validator_rejects_disagreement_and_bad_shapes` |
| Prompt never sees wallets or state; fence is a fixed point | `test_prompt_never_sees_wallets_or_state`, `test_fence_strip_is_fixed_point` |
| The deck view sorted by due day | `test_get_deck_is_sorted_by_due_day` |
| Every revert string has a dedicated test; check order | `test_every_revert_string_has_exactly_one_dedicated_test`, `test_check_order_owner_before_due`, `test_check_order_add_card` |
| The planned on-chain table, replayed in order | `test_runtime_table_in_order` |
| Card ids, term matches and sentence keys shared with the frontend | `test_vectors_match_contract` |

Frontend (`tests/js/*.test.ts`): Python-string parity, card ids, the whole-word check and sentence keys against the
contract vectors, view parsing, every revert sentence equal to the source and fired in the source's order, the schedule
preview, postconditions for every write, receipt classification, calldata sizes, source hash, repository rules.
