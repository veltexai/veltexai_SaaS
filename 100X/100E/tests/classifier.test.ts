import { classifyReply, normalizeReplyText } from "../src/classifier";

describe("100E deterministic reply classifier", () => {
  test.each([
    ["Please unsubscribe me", "unsubscribe", "no_action", "do_not_contact"],
    ["No thanks, we're all set", "not_interested", "no_action", "do_not_contact"],
    ["Can we schedule a call tomorrow?", "meeting_intent", "scheduling_review", null],
    ["Interested, please send more details", "interested", "sales_review", null],
    ["You have the wrong person", "wrong_person", "human_review", "do_not_contact"],
    ["I am out of the office until Monday", "out_of_office", "follow_up_later", null],
  ])("classifies %s", (text, classification, route, suppressionKind) => {
    expect(classifyReply(text, "reply_received")).toMatchObject({ classification, route, suppressionKind });
  });

  it("uses provider auto-reply semantics before content rules", () => {
    expect(classifyReply("Call me", "auto_reply_received")).toMatchObject({ classification: "automatic_reply", route: "follow_up_later" });
  });

  it("removes HTML and never returns raw markup", () => {
    expect(normalizeReplyText("<p>Tell me &amp; send details</p><script>secret()</script>")).toBe("Tell me & send details");
  });
});
