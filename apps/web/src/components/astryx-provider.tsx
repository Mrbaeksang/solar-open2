"use client";

import { InternationalizationProvider } from "@astryxdesign/core";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import type { ReactNode } from "react";

const koreanOverrides = {
  "@astryx.appShell.mobileNavigation": "모바일 메뉴",
  "@astryx.citation.label": "출처 {number, number}",
  "@astryx.chat.status.sending": "보내는 중",
  "@astryx.chat.status.sent": "보냄",
  "@astryx.chat.status.failed": "전송 실패",
  "@astryx.chatSendButton.send": "보내기",
  "@astryx.chatSendButton.stop": "답변 멈추기",
  "@astryx.chatLayout.newMessages": "새 답변",
  "@astryx.chatLayoutScrollButton.scrollToBottom": "최근 답변으로 이동",
  "@astryx.chatMessage.messageFrom":
    "{sender, select, user {나} assistant {AI 설명 도우미} system {시스템} other {도우미}}의 메시지",
  "@astryx.popover.close": "닫기",
  "@astryx.sideNavCollapseButton.expandSidebar": "목차 펼치기",
  "@astryx.sideNavCollapseButton.collapseSidebar": "목차 접기",
  "@astryx.topNav.landmarkLabel": "주요 메뉴",
} as const;

export function AstryxProvider({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme} mode="light">
      <InternationalizationProvider
        locale="ko"
        overrides={{ ko: koreanOverrides }}
      >
        {children}
      </InternationalizationProvider>
    </Theme>
  );
}
