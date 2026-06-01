export async function sendTelegramNotification(
  supabase: any,
  message: string,
): Promise<boolean> {
  try {
    const { data: botTokenSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "telegram_bot_token")
      .single();

    const { data: chatIdsSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "telegram_chat_ids")
      .single();

    let botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    let chatIds: string[] = [];

    if (
      botTokenSetting?.value && typeof botTokenSetting.value === "string" &&
      botTokenSetting.value.trim() !== ""
    ) {
      botToken = botTokenSetting.value;
    }

    if (
      chatIdsSetting?.value && Array.isArray(chatIdsSetting.value) &&
      chatIdsSetting.value.length > 0
    ) {
      chatIds = chatIdsSetting.value;
    } else {
      const envChatId = Deno.env.get("TELEGRAM_CHAT_ID");
      if (envChatId) {
        chatIds = [envChatId];
      }
    }

    if (!botToken || chatIds.length === 0) {
      console.error("Telegram not configured: token or chat IDs missing");
      return false;
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const sendPromises = chatIds.map((chatId: string) =>
      fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      })
    );

    const results = await Promise.allSettled(sendPromises);
    const allFailed = results.every((r) => r.status === "rejected");

    if (allFailed) {
      console.error("All Telegram sends failed");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

export function sanitizeHTML(str: string): string {
  if (!str) return "";
  return str.replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c),
  );
}
