import React from 'react';

// ────────────────────────────────────────────────────────────
//  이용약관 내용 — 공정거래위원회 표준약관 제10078호 기반
//  Mystic Lotto 서비스 맞춤 수정 (30조)
//  시행일: 2026년 3월 1일
// ────────────────────────────────────────────────────────────
export const TermsContent: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
    <div className="text-center space-y-1 pb-4 border-b border-white/10">
      <p className="text-xs font-black text-indigo-300 tracking-widest uppercase">Mystic Lotto 이용약관</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">시행일: 2026년 3월 1일 · 표준약관 제10078호 기반</p>
    </div>

    <Section title="제1조 (목적)">
      <p>
        이 약관은 미스틱로또(이하 "회사")가 운영하는 웹 서비스 "Mystic Lotto"(이하 "서비스")의 이용과 관련하여
        회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    </Section>

    <Section title="제2조 (정의)">
      <p className="mb-3">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
      <ul className="space-y-2 list-none">
        <Li>① <b>"서비스"</b>란 회사가 제공하는 AI 운세 분석, 로또 번호 추천, 봉헌 제단, 커뮤니티 등 일체의 콘텐츠 및 기능을 말합니다.</Li>
        <Li>② <b>"회원"</b>이란 이 약관에 동의하고 Google 계정(OAuth 2.0)을 통해 이용계약을 체결한 자를 말합니다.</Li>
        <Li>③ <b>"이용자"</b>란 회원 여부를 불문하고 서비스에 접속하여 콘텐츠를 이용하는 자를 말합니다.</Li>
        <Li>④ <b>"콘텐츠"</b>란 서비스를 통해 제공되는 부호·문자·음성·음향·이미지·영상 등 디지털 형태의 제작물 일체를 말합니다.</Li>
        <Li>⑤ <b>"유료콘텐츠"</b>란 회사가 유료로 제공하는 콘텐츠 및 이에 수반되는 서비스를 말합니다.</Li>
        <Li>⑥ <b>"나디르(Nadir)"</b>란 회원이 현금으로 구매하여 유료 서비스 이용에 사용하는 디지털 재화(선불식 전자지급수단에 준함)를 말합니다.</Li>
        <Li>⑦ <b>"루멘(Lumen)"</b>이란 봉헌·출석·활동 등을 통해 획득하는 서비스 내 전용 화폐로, 현금 또는 나디르로 교환·환급되지 아니합니다.</Li>
        <Li>⑧ <b>"봉헌"</b>이란 나디르를 소비하여 일정 확률에 따라 루멘을 획득하는 확률형 콘텐츠를 말합니다.</Li>
        <Li>⑨ <b>"구슬(Orb)"</b>이란 회원의 서비스 성장 지표로, 레벨에 따라 봉헌 고배율 확률에 영향을 줍니다.</Li>
        <Li>⑩ <b>"전자적 대금지급"</b>이란 회사가 제공하는 결제 수단을 이용하여 대금을 지급하는 방법을 말합니다.</Li>
        <Li>⑪ <b>"게시물"</b>이란 회원이 서비스 이용 과정에서 게시한 문자·이미지·영상·링크 등 일체의 정보를 말합니다.</Li>
      </ul>
    </Section>

    <Section title="제3조 (회사 정보의 제공)">
      <p className="mb-3">회사는 다음 사항을 서비스 초기화면 또는 연결화면을 통해 회원이 쉽게 알 수 있도록 표시합니다.</p>
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2 text-[12px]">
        <p><span className="text-slate-500 w-28 inline-block">상호:</span> <span className="text-slate-300">미스틱로또</span></p>
        <p><span className="text-slate-500 w-28 inline-block">대표자:</span> <span className="text-slate-300">[대표자명]</span></p>
        <p><span className="text-slate-500 w-28 inline-block">주소:</span> <span className="text-slate-300">[사업장 주소]</span></p>
        <p><span className="text-slate-500 w-28 inline-block">사업자등록번호:</span> <span className="text-slate-300">[000-00-00000]</span></p>
        <p><span className="text-slate-500 w-28 inline-block">통신판매업신고:</span> <span className="text-slate-300">[제0000-지역-0000호]</span></p>
        <p><span className="text-slate-500 w-28 inline-block">고객센터 이메일:</span> <span className="text-slate-300">mysticlotto.help@gmail.com</span></p>
      </div>
    </Section>

    <Section title="제4조 (약관의 게시 및 개정)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기화면 또는 연결화면에 게시합니다.</Li>
        <Li>② 회사는 「콘텐츠산업 진흥법」, 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」 등 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있습니다.</Li>
        <Li>③ 약관을 개정하는 경우 개정 약관의 적용 일자 및 개정 사유를 명시하여 현행 약관과 함께 적용 일자 <b>7일 전</b>부터 공지합니다. 다만 회원에게 불리한 내용으로 변경하는 경우에는 <b>30일 전</b>부터 공지합니다.</Li>
        <Li>④ 회원이 개정 약관의 적용 일자 이후에도 서비스를 계속 이용하는 경우 개정된 약관에 동의한 것으로 간주합니다.</Li>
        <Li>⑤ 회원이 개정 약관에 동의하지 않을 경우 서비스 이용을 중단하고 이용계약을 해지할 수 있습니다.</Li>
        <Li>⑥ 이 약관에서 정하지 않은 사항은 「콘텐츠산업 진흥법」, 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령 및 일반 상관례에 따릅니다.</Li>
      </ul>
    </Section>

    <Section title="제5조 (이용계약의 체결)">
      <ul className="space-y-2 list-none">
        <Li>① 이용계약은 회원이 되고자 하는 자(이하 "가입신청자")가 이 약관 및 개인정보처리방침에 동의한 후 Google 계정을 통해 로그인함으로써 체결됩니다.</Li>
        <Li>② 가입신청자는 약관 동의 시 본인이 <b className="text-rose-400">만 19세 이상의 성인</b>임을 확인하고 보증합니다.</Li>
        <Li>③ 회사는 다음 각 호에 해당하는 가입 신청에 대해 승낙을 거부하거나 사후에 이용계약을 해지할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 만 19세 미만의 미성년자가 가입을 신청한 경우</li>
            <li>• 타인의 명의 또는 허위 정보를 사용하여 신청한 경우</li>
            <li>• 관련 법령에 위반하여 이용계약을 신청한 경우</li>
            <li>• 이전에 이용약관 위반으로 이용계약이 해지된 사실이 있는 경우</li>
            <li>• 기타 회사가 서비스 운영상 필요하다고 판단하는 경우</li>
          </ul>
        </Li>
        <Li>④ 이용계약의 성립 시기는 Google 로그인 완료 후 회원 데이터가 최초 생성된 시점으로 합니다.</Li>
      </ul>
    </Section>

    <Section title="제6조 (미성년자 보호)">
      <ul className="space-y-2 list-none">
        <Li>① 본 서비스는 <b className="text-rose-400">만 19세 이상의 성인만 이용</b>할 수 있습니다. 서비스 내 확률형 콘텐츠(봉헌), 유료 결제 등이 포함된 바, 미성년자의 이용을 엄격히 금지합니다.</Li>
        <Li>② 미성년자가 법정대리인의 동의 없이 이용계약을 체결하거나 유료 결제를 한 경우, 법정대리인은 해당 계약을 취소할 수 있습니다. 다만 미성년자가 성인인 것처럼 속인 경우에는 그러하지 아니합니다.</Li>
        <Li>③ 미성년자의 무단 이용으로 인해 발생한 모든 피해 및 법적 책임은 해당 미성년자 및 그 법정대리인에게 있습니다.</Li>
        <Li>④ 회사는 이용자가 미성년자임을 인지하는 경우 즉시 서비스 이용을 제한하고 계정을 정지할 수 있습니다.</Li>
      </ul>
    </Section>

    <Section title="제7조 (계정 관리)">
      <ul className="space-y-2 list-none">
        <Li>① 회원은 1인 1계정을 원칙으로 하며, Google 계정 1개당 1개의 서비스 계정만 생성할 수 있습니다.</Li>
        <Li>② 회원은 계정의 Google 로그인 정보를 직접 관리할 책임이 있으며, 타인에게 계정을 양도·대여·공유해서는 아니 됩니다.</Li>
        <Li>③ 회원이 자신의 계정을 타인이 무단으로 사용하고 있음을 인지한 경우 즉시 회사에 통지해야 합니다.</Li>
        <Li>④ 계정 관리 소홀, 타인에의 제공, 허위 신고 등으로 인한 손해에 대해 회사는 책임을 지지 않습니다.</Li>
        <Li>⑤ 회원의 루멘·나디르·서비스 이용 기록 등 계정 데이터는 해당 계정에 귀속되며 타 계정으로 이전되지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제8조 (서비스의 내용)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 다음의 서비스를 제공합니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• <b>천기누설</b>: AI(Google Gemini)를 활용한 운세 분석 및 로또 번호 추천</li>
            <li>• <b>천명수</b>: 연간 대운 및 생애 운명 번호 분석</li>
            <li>• <b>지성분석</b>: 통계·과학적 방법론에 기반한 번호 분석</li>
            <li>• <b>봉헌 제단</b>: 나디르를 소비하여 확률에 따라 루멘을 획득하는 확률형 콘텐츠</li>
            <li>• <b>천상의 광장</b>: 회원 간 실시간 채팅·게시판 커뮤니티</li>
            <li>• <b>개인 성소(Private Sanctum)</b>: 회원 프로필, 서고, 인벤토리 관리</li>
          </ul>
        </Li>
        <Li>② 본 서비스의 모든 운세 정보 및 번호 추천은 <b className="text-amber-400">순수한 오락·엔터테인먼트 목적으로 제공</b>되며, 실제 당첨·수익·미래 사건을 보장하지 않습니다.</Li>
        <Li>③ 운세 결과는 투자·도박·법적 판단·의료적 결정의 근거로 사용할 수 없습니다.</Li>
        <Li>④ 회사는 서비스의 품질 향상을 위하여 서비스의 내용·형식을 변경할 수 있습니다.</Li>
      </ul>
    </Section>

    <Section title="제9조 (서비스의 변경 및 중단)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 상당한 이유가 있는 경우 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있습니다.</Li>
        <Li>② 회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
            <li>• 정전, 제반 설비의 장애 또는 이용량 폭주로 정상적인 서비스 제공이 불가능한 경우</li>
            <li>• 천재지변, 전쟁, 테러, 해킹 등 불가항력적 사유가 있는 경우</li>
            <li>• 기타 중대한 사유로 서비스 제공이 부적절하다고 판단하는 경우</li>
          </ul>
        </Li>
        <Li>③ 회사가 서비스를 변경·중단하는 경우 회원이 알 수 있도록 사전에 공지합니다. 단, 회사가 통제할 수 없는 사유로 인한 경우에는 사후에 공지할 수 있습니다.</Li>
        <Li>④ 서비스 중단으로 인해 회원이 입은 손해에 대해 회사는 「콘텐츠이용자보호지침」 등 관련 규정이 정하는 바에 따라 보상합니다. 단, 회사의 고의 또는 과실이 없는 경우에는 그러하지 아니합니다.</Li>
      </ul>
    </Section>

    <Section title="제10조 (서비스 이용 시간)">
      <ul className="space-y-2 list-none">
        <Li>① 서비스는 원칙적으로 연중무휴, 1일 24시간 제공합니다. 단, 시스템 점검·증설·교체 시 일시 중단될 수 있습니다.</Li>
        <Li>② 정기 점검은 서비스 초기화면에 사전 공지합니다.</Li>
        <Li>③ AI 기반 콘텐츠(천기누설, 천명수, 지성분석)는 외부 AI 서비스(Google Gemini)의 상태에 따라 일시적으로 이용이 제한될 수 있으며, 이에 대해 회사는 책임을 지지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제11조 (회원에 대한 통지)">
      <ul className="space-y-2 list-none">
        <Li>① 회사가 회원에게 통지하는 경우 서비스 내 공지사항, 토스트 알림, 이메일 등의 방법으로 합니다.</Li>
        <Li>② 불특정 다수 회원에 대한 통지는 서비스 내 공지사항 게시로 갈음할 수 있습니다.</Li>
        <Li>③ 회원이 연락처를 허위로 제공하거나 수신을 거부한 경우 발생하는 불이익에 대해 회사는 책임을 지지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제12조 (유료 콘텐츠 이용요금 및 결제)">
      <ul className="space-y-2 list-none">
        <Li>① 나디르의 판매 가격 및 구성은 서비스 내 충전 탭에 표시된 내용을 따릅니다.</Li>
        <Li>② 나디르 충전 시 추가혜택(보너스 나디르)이 제공되는 경우, 기본 나디르와 추가혜택 나디르를 분리 표시합니다.</Li>
        <Li>③ 결제는 회사가 지정하는 결제 수단(신용카드, 체크카드, 간편결제 등)을 이용하며, 결제대행사(PG사)를 통해 처리됩니다. 회사는 회원의 결제수단 정보를 직접 저장하지 않습니다.</Li>
        <Li>④ 회사는 나디르 가격을 변경할 경우 최소 7일 전에 서비스 내 공지합니다.</Li>
        <Li>⑤ 회원이 결제한 이용요금에 오류가 있는 경우 회사에 정정을 요청할 수 있으며, 회사는 이를 확인 후 처리합니다.</Li>
      </ul>
    </Section>

    <Section title="제13조 (나디르(Nadir) 충전 및 사용)">
      <ul className="space-y-2 list-none">
        <Li>① 나디르는 현금을 충전하여 취득하는 디지털 재화로, 서비스 내 유료 콘텐츠 이용에 사용됩니다.</Li>
        <Li>② 나디르의 유효기간은 별도 표시가 없는 한 이용계약 종료(탈퇴·영구 정지) 시까지입니다.</Li>
        <Li>③ 나디르는 서비스 내 봉헌 제단(제18조)을 통해 확률에 따라 루멘으로 전환될 수 있으나, 이는 유료 콘텐츠 이용의 결과이며 단순 환전이 아닙니다. 나디르를 현금 또는 기타 외부 재화로 환전하는 것은 불가하며(제15조 청약철회 제외), 제3자에게 양도·증여·판매할 수 없습니다.</Li>
        <Li>④ 나디르 충전 시 제공되는 추가혜택(보너스) 나디르는 「모바일게임 표준약관」 제23조제2항제2호에 따른 추가혜택에 해당하며, 사용된 경우 청약철회 대상에서 제외됩니다.</Li>
        <Li>⑤ 나디르는 미사용 상태로 구매일로부터 7일 이내에 한하여 청약철회를 신청할 수 있습니다. 단, 1나디르라도 사용된 경우 미사용 잔액에 대한 환불을 포함하여 청약철회가 불가합니다.</Li>
        <Li>⑥ 회원 탈퇴 시 보유 나디르 중 <b>구매일로부터 7일 이내의 미사용 나디르</b>에 한하여 고객센터(mysticlotto.help@gmail.com)를 통해 환불을 신청할 수 있습니다. 단, 7일이 초과되거나 7일 이내라도 사용된 잔여 나디르는 소멸되며 환급되지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제14조 (루멘(Lumen) 획득 및 사용)">
      <ul className="space-y-2 list-none">
        <Li>① 루멘은 다음의 방법으로 획득할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 봉헌 제단에서 나디르를 소비한 결과로 확률에 따라 획득</li>
            <li>• 매일 첫 방문 출석 보너스</li>
            <li>• 광고 시청 보상 (운영 정책에 따라 변경 가능)</li>
            <li>• 다른 회원으로부터 선물 수령</li>
            <li>• 기타 회사가 공지한 이벤트·프로모션</li>
          </ul>
        </Li>
        <Li>② 루멘은 서비스 내 유료 콘텐츠(천기누설, 천명수, 지성분석, 채팅방 생성 등) 이용에 사용됩니다.</Li>
        <Li>③ 루멘은 나디르·현금 또는 다른 재화로 역환전·환급되지 아니합니다. 봉헌은 나디르를 소비하여 루멘을 획득하는 단방향 구조이며, 반대 방향(루멘 → 나디르)의 전환은 허용되지 않습니다.</Li>
        <Li>④ 루멘은 서비스 종료, 계정 해지, 이용 정지 시 소멸하며 어떠한 보상도 제공되지 않습니다.</Li>
        <Li>⑤ 부정한 방법으로 획득한 루멘은 회사가 사전 통보 없이 회수할 수 있습니다.</Li>
        <Li>⑥ 앱 외부(제3자 거래, 비공식 경로 등)에서 취득한 루멘은 어떠한 경우에도 서비스 내에서 사용할 수 없으며, 이를 위반한 경우 해당 루멘은 즉시 회수되고 계정이 제한될 수 있습니다.</Li>
      </ul>
    </Section>

    <Section title="제15조 (청약철회 및 환불)">
      <ul className="space-y-2 list-none">
        <Li>① 회원은 나디르 구매일로부터 7일 이내에 청약철회를 할 수 있습니다. 단, 다음 각 호에 해당하는 경우에는 청약철회가 제한됩니다.
          <ul className="ml-4 mt-2 space-y-2">
            <li>1. 나디르를 1나디르라도 사용한 경우</li>
            <li>2. 추가혜택(보너스) 나디르가 사용된 경우 (기본 나디르와 추가혜택 나디르는 선입선출 방식으로 소진됨)</li>
            <li>3. 구매일로부터 7일이 경과한 경우</li>
          </ul>
        </Li>
        <Li>② 위 제한 사유는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조제2항 및 「콘텐츠산업 진흥법」 제27조에 근거합니다.</Li>
        <Li>③ 청약철회 신청은 고객센터 이메일(mysticlotto.help@gmail.com)로 접수합니다. 회사는 접수일로부터 3영업일 이내에 처리합니다.</Li>
        <Li>④ 청약철회가 인정된 경우 회사는 환급 사유 발생일로부터 3영업일 이내에 결제수단에 따라 환급 조치합니다. 신용카드 결제의 경우 카드사 정책에 따라 환급 시기가 달라질 수 있습니다.</Li>
        <Li>⑤ 구독 플랜(월정액·연간)의 해지는 언제든지 신청할 수 있습니다. 해지 신청이 접수되면 <b>다음 갱신일부터 자동 결제가 중단</b>되며, 현재 구독 기간의 <b>만료일까지는 정상적으로 서비스를 이용</b>할 수 있습니다. 이미 결제된 구독 기간에 대한 중도 환급은 제공되지 않습니다. (넷플릭스·유튜브 등 일반적인 구독 서비스와 동일한 방식)</Li>
      </ul>
    </Section>

    <Section title="제16조 (청약철회의 효과)">
      <ul className="space-y-2 list-none">
        <Li>① 청약철회가 인정된 경우, 회원은 사용하지 않은 나디르를 반환하고 회사는 결제 금액을 환급합니다.</Li>
        <Li>② 회원이 청약철회 시 이미 사용한 나디르에 해당하는 금액은 환급 대상에서 제외됩니다.</Li>
        <Li>③ 추가혜택으로 제공된 나디르가 사용된 경우, 해당 추가혜택에 상응하는 금액을 공제할 수 있습니다.</Li>
        <Li>④ 회원의 귀책 사유로 인한 반환 비용은 회원이 부담합니다.</Li>
      </ul>
    </Section>

    <Section title="제17조 (과오납금의 환급)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 과오납금이 발생한 경우 과오납금을 회원에게 환급합니다.</Li>
        <Li>② 회사의 귀책 사유로 인한 과오납금에 대해서는 이자를 가산하여 환급합니다.</Li>
        <Li>③ 회원의 귀책 사유로 인한 과오납금에 대해서는 실제 소요된 비용을 공제한 금액을 환급합니다.</Li>
        <Li>④ 회사는 회원이 주장하는 과오납금이 과오납금에 해당하지 않는다고 판단되는 경우 그 이유를 회원에게 알립니다.</Li>
      </ul>
    </Section>

    <Section title="제18조 (확률형 콘텐츠 — 봉헌 제단)">
      <ul className="space-y-2 list-none">
        <Li>① 봉헌 제단은 나디르를 소비하여 확률에 따라 루멘을 획득하는 확률형 콘텐츠입니다.</Li>
        <Li>② 회사는 「콘텐츠산업 진흥법」 제33조의2 및 관련 법령에 따라 봉헌의 결과물 종류·내용·획득 확률을 봉헌 탭의 <b>"봉헌 보상 확률 정보"</b>에 공시합니다. 공시 내용은 다음과 같습니다.
          <ul className="ml-4 mt-3 space-y-2">
            <li className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
              <p className="text-[11px] font-black text-indigo-300 mb-2">구슬 레벨별 봉헌 배율 확률</p>
              <p className="text-[10px] text-slate-400">※ 구슬 레벨이 높을수록 고배율 확률이 증가합니다.</p>
              <p className="text-[10px] text-slate-400 mt-1">• 1배(원금 지급): 레벨별 약 40%~50%</p>
              <p className="text-[10px] text-slate-400">• 2배: 레벨별 약 25%~35%</p>
              <p className="text-[10px] text-slate-400">• 5배: 레벨별 약 12%~18%</p>
              <p className="text-[10px] text-slate-400">• 10배: 레벨별 약 3%~7%</p>
              <p className="text-[10px] text-slate-400 mt-1">※ 정확한 확률표는 봉헌 탭에서 확인하십시오.</p>
            </li>
          </ul>
        </Li>
        <Li>③ 봉헌 확률은 회원의 구슬 레벨(Orb Level)에 따라 달라지며, 레벨별 상세 확률은 봉헌 탭 내 "봉헌 보상 확률 정보"에서 확인할 수 있습니다. 이는 「콘텐츠산업 진흥법」 제33조의2에 따른 확률 공시 의무의 이행입니다.</Li>
        <Li>④ 봉헌이 시작된 이후에는 나디르가 소비된 것으로 처리되며, 이 약관 제15조의 청약철회 제한 사유에 해당하여 취소·환불이 불가합니다.</Li>
        <Li>⑤ 확률형 콘텐츠의 결과는 서버에서 무작위로 생성되며, 이전 봉헌 결과는 이후 결과에 영향을 주지 않습니다(독립 시행).</Li>
        <Li>⑥ 회사는 확률형 콘텐츠의 확률을 변경하는 경우 변경 7일 전 이상 사전 공지하며, 변경 후 공시 내용을 즉시 갱신합니다.</Li>
      </ul>
    </Section>

    <Section title="제19조 (게시물의 관리)">
      <ul className="space-y-2 list-none">
        <Li>① 회원이 서비스(천상의 광장 등)에 게시한 게시물에 대한 저작권은 해당 회원에게 있습니다.</Li>
        <Li>② 회사는 서비스의 운영·홍보·개선·연구 목적으로 회원의 게시물을 무상으로 사용할 수 있습니다. 이 경우 회원의 이익을 부당하게 침해하지 않는 범위 내에서 사용합니다.</Li>
        <Li>③ 회사는 다음 각 호에 해당하는 게시물을 사전 통보 없이 삭제하거나 이동·수정할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 음란·폭력·혐오·차별적 내용이 포함된 게시물</li>
            <li>• 타인의 개인정보를 무단으로 포함한 게시물</li>
            <li>• 타인의 명예를 훼손하거나 프라이버시를 침해하는 게시물</li>
            <li>• 영리 목적의 광고·스팸 성격의 게시물</li>
            <li>• 불법적인 내용이 포함되거나 법령을 위반하는 게시물</li>
            <li>• 서비스의 정상적인 운영을 방해하는 게시물</li>
          </ul>
        </Li>
        <Li>④ 회원 탈퇴 시 회원이 작성한 게시물은 삭제되지 않을 수 있으며, 커뮤니티 특성상 삭제를 원하는 경우 탈퇴 전에 직접 삭제해야 합니다.</Li>
      </ul>
    </Section>

    <Section title="제20조 (지식재산권)">
      <ul className="space-y-2 list-none">
        <Li>① 서비스 및 서비스 내 콘텐츠(텍스트, 이미지, 로고, UI 디자인, 소프트웨어, AI 생성 결과물 포함)에 대한 저작권 및 지식재산권은 회사에 귀속됩니다.</Li>
        <Li>② 회원은 회사의 사전 서면 동의 없이 서비스 콘텐츠를 복제, 배포, 전송, 전시, 판매, 2차 저작물 작성, 상업적 이용 등에 사용할 수 없습니다.</Li>
        <Li>③ 서비스에서 AI를 통해 생성된 운세·분석 결과물은 회원 개인의 참고 목적으로만 이용할 수 있으며, 무단 배포·상업적 이용을 금합니다.</Li>
        <Li>④ 회원이 이 조항을 위반하여 발생한 회사 또는 제3자의 손해에 대해 회원이 책임을 집니다.</Li>
      </ul>
    </Section>

    <Section title="제21조 (회원 아이디 및 계정 보안)">
      <ul className="space-y-2 list-none">
        <Li>① 회원의 서비스 계정은 Google 계정과 연동되며, 보안 관리 책임은 회원(및 Google)에게 있습니다.</Li>
        <Li>② 회원은 자신의 Google 계정 정보(이메일, 비밀번호)를 안전하게 관리해야 하며, 이를 타인에게 양도·대여해서는 아니 됩니다.</Li>
        <Li>③ 회원의 계정이 무단으로 사용되고 있음을 인지한 경우 즉시 회사에 신고하고 Google 계정 보안 조치를 취해야 합니다.</Li>
        <Li>④ 회원이 계정 보안 관리를 소홀히 하여 발생한 손해에 대해 회사는 고의 또는 과실이 없는 한 책임을 지지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제22조 (회사의 의무)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 관련 법령과 이 약관을 준수하며, 안정적으로 서비스를 제공합니다.</Li>
        <Li>② 회사는 회원의 개인정보를 보호하기 위해 보안 시스템을 갖추고, 개인정보처리방침을 준수합니다.</Li>
        <Li>③ 회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정하는 경우 이를 처리하고, 처리 결과를 회원에게 통지합니다.</Li>
        <Li>④ 회사는 확률형 콘텐츠(봉헌)의 확률 정보를 법령에 따라 정확하게 공시하고 유지합니다.</Li>
        <Li>⑤ 회사는 회원의 불만 처리를 위해 고객센터(mysticlotto.help@gmail.com)를 운영합니다.</Li>
      </ul>
    </Section>

    <Section title="제23조 (회원의 의무 및 금지 행위)">
      <ul className="space-y-2 list-none">
        <Li>① 회원은 이 약관, 회사의 공지사항, 관련 법령을 준수해야 합니다.</Li>
        <Li>② 회원은 다음 각 호의 행위를 해서는 아니 됩니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>1. 회원가입 시 허위 정보를 기재하거나 타인의 정보를 도용하는 행위</li>
            <li>2. 회사가 게시한 정보를 변경하거나 서비스를 이용하여 취득한 정보를 회사의 사전 승낙 없이 영리 목적으로 이용하는 행위</li>
            <li>3. 서비스의 운영을 고의로 방해하거나 서버를 해킹·크래킹하는 행위</li>
            <li>4. 악성코드·스파이웨어 등을 배포하는 행위</li>
            <li>5. 음란·폭력·혐오·차별적 콘텐츠를 게시하거나 유통하는 행위</li>
            <li>6. 타인의 명예를 훼손하거나 사생활을 침해하는 행위</li>
            <li>7. 나디르·루멘을 현금 또는 현금성 자산으로 교환하거나 제3자에게 유상으로 양도·판매하는 행위</li>
            <li>8. 자동화된 수단(매크로, 봇 등)을 이용하여 서비스를 이용하거나 루멘·나디르를 부정하게 취득하는 행위</li>
            <li>9. 만 19세 미만의 미성년자로서 서비스를 이용하거나 결제하는 행위</li>
            <li>10. 서비스 내 채팅·게시판 등에서 특정 외부 결제 URL·경로를 다른 회원에게 홍보하거나 이용을 권유하는 행위. 단, 회원 개인이 자발적으로 공개 정보를 단순 언급하는 것까지 금지하지는 않으나, 반복적·조직적으로 특정 결제 경로를 유도하는 경우는 제한 대상이 됩니다.</li>
            <li>11. 기타 법령 또는 공서양속에 반하는 행위</li>
          </ul>
        </Li>
        <Li>③ 회원이 위 의무를 위반한 경우, 회사는 사전 통보 없이 이용을 제한하거나 계정을 정지·삭제할 수 있습니다.</Li>
      </ul>
    </Section>

    <Section title="제24조 (서비스 이용 제한)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 회원이 이 약관을 위반한 경우 경고, 일시 정지, 영구 이용 정지 등의 단계적 제한 조치를 취할 수 있습니다. 다만 위반의 정도가 중대한 경우에는 즉시 영구 정지할 수 있습니다.</Li>
        <Li>② 다음 각 호에 해당하는 경우에는 즉시 영구 정지 조치를 할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 나디르·루멘의 부정 취득 또는 불법 거래</li>
            <li>• 해킹·크래킹 등 서비스 공격 행위</li>
            <li>• 아동·청소년 성착취물 유포</li>
            <li>• 미성년자의 이용 사실이 확인된 경우</li>
            <li>• 1년 이상 서비스를 이용하지 않는 장기 미이용 계정 (사전 공지 후 조치)</li>
          </ul>
        </Li>
        <Li>③ 이용 제한 시 보유 루멘은 소멸하며 환급되지 않습니다. 미사용 나디르에 대해서는 제15조의 청약철회 규정에 따라 처리합니다.</Li>
        <Li>④ 회사는 신고 접수된 대화방의 데이터(메시지, 참여자 정보 등)를 분쟁 해결 및 법적 의무 이행을 위해 검토 완료 시까지 보관할 수 있습니다. 검토 결과 위반 사실이 없는 경우 해당 데이터는 검토 완료 후 정상적인 소멸 절차에 따라 처리됩니다.</Li>
        <Li>⑤ 제④항에 따라 보관 중인 대화방은 성주(방 개설자)의 즉시 소멸 요청이 제한될 수 있으며, 24시간 예약 소멸은 허용되나 실제 삭제는 검토 완료 후 이루어집니다.</Li>
      </ul>
    </Section>

    <Section title="제25조 (이용 제한에 대한 이의신청)">
      <ul className="space-y-2 list-none">
        <Li>① 이용 제한 조치를 받은 회원은 조치일로부터 30일 이내에 고객센터 이메일(mysticlotto.help@gmail.com)로 이의신청을 할 수 있습니다.</Li>
        <Li>② 회사는 이의신청을 접수한 날로부터 15일 이내에 처리 결과를 회원에게 통보합니다.</Li>
        <Li>③ 이의신청이 정당하다고 인정되는 경우 회사는 즉시 서비스 이용을 재개합니다.</Li>
      </ul>
    </Section>

    <Section title="제26조 (손해배상)">
      <ul className="space-y-2 list-none">
        <Li>① 회사의 고의 또는 과실로 인하여 회원에게 손해가 발생한 경우 회사는 그 손해를 배상합니다.</Li>
        <Li>② 회원이 이 약관을 위반하여 회사 또는 제3자에게 손해를 입힌 경우 회원은 해당 손해를 배상합니다.</Li>
        <Li>③ 회사가 개별 서비스와 관련하여 회원에게 배상할 손해액은, 회사의 고의 또는 중대한 과실이 없는 한, 해당 서비스 이용과 관련하여 회원이 지급한 금액을 한도로 합니다.</Li>
        <Li>④ 운세 분석 서비스는 오락·참고 목적으로 제공되는 바, 운세 결과를 근거로 한 의사결정(투자·도박·의료 등)으로 인한 손해에 대해 회사는 책임을 지지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제27조 (면책조항)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 천재지변, 전쟁, 인터넷 통신망 장애, 정전, 서버 해킹, 외부 AI 서비스 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</Li>
        <Li>② 회사는 회원의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</Li>
        <Li>③ 회사는 회원이 서비스를 이용하면서 기대하는 이익(로또 당첨, 운세 실현 등)에 대해 책임을 지지 않습니다.</Li>
        <Li>④ 회사는 회원 상호 간 또는 회원과 제3자 간의 분쟁에 대해 개입하지 않으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</Li>
        <Li>⑤ 서비스에서 제공하는 AI 운세 분석 결과는 <b className="text-amber-400">순수한 오락·엔터테인먼트 목적</b>이며, 법적·금융·의료·투자 판단의 근거로 사용할 수 없습니다. 이를 근거로 발생한 손해에 대해 회사는 어떠한 책임도 지지 않습니다.</Li>
      </ul>
    </Section>

    <Section title="제28조 (개인정보 보호)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 「개인정보 보호법」 등 관련 법령에 따라 회원의 개인정보를 보호하며, 이를 위해 개인정보처리방침을 수립·공개합니다.</Li>
        <Li>② 개인정보처리방침의 내용은 서비스 내 별도 팝업 또는 연결화면을 통해 확인할 수 있습니다.</Li>
        <Li>③ 회원의 개인정보에 관한 자세한 사항은 별도의 "개인정보처리방침"에서 정합니다.</Li>
      </ul>
    </Section>

    <Section title="제29조 (소비자 피해보상)">
      <ul className="space-y-2 list-none">
        <Li>① 회사는 「콘텐츠이용자보호지침」에 따라 다음과 같이 소비자 피해를 보상합니다.
          <ul className="ml-4 mt-2 space-y-1">
            <li>• 결제 오류·중복 결제: 접수일로부터 3영업일 이내 전액 환급</li>
            <li>• 서비스 장애로 인한 나디르 소진: 소진된 나디르 복구 또는 상당 금액 환급</li>
            <li>• 확률 오류로 인한 봉헌 결과 이상: 해당 나디르 복구 또는 보상</li>
          </ul>
        </Li>
        <Li>② 피해 보상 신청은 고객센터 이메일(mysticlotto.help@gmail.com)로 접수합니다.</Li>
        <Li>③ 회사는 이의신청 접수 후 10영업일 이내에 처리 결과를 통보합니다.</Li>
        <Li>④ 이 약관에서 정하지 않은 소비자 피해보상의 기준·범위·방법 등에 관한 사항은 「소비자분쟁해결기준」에 따릅니다.</Li>
      </ul>
    </Section>

    <Section title="제30조 (준거법 및 재판 관할)">
      <ul className="space-y-2 list-none">
        <Li>① 이 약관 및 서비스 이용에 관한 분쟁에 대해서는 대한민국 법률을 준거법으로 합니다.</Li>
        <Li>② 서비스 이용과 관련하여 회사와 회원 간에 분쟁이 발생한 경우, 상호 협의를 통해 해결하도록 노력합니다.</Li>
        <Li>③ 협의가 이루어지지 않는 경우 「콘텐츠산업 진흥법」에 따른 콘텐츠분쟁조정위원회의 조정을 신청할 수 있습니다.</Li>
        <Li>④ 소송이 제기되는 경우 「민사소송법」에 따른 관할 법원에 소를 제기합니다.</Li>
      </ul>
    </Section>

    <div className="pt-6 border-t border-white/10 space-y-2 text-center text-[10px] text-slate-500">
      <p>본 약관은 <b className="text-slate-400">2026년 3월 1일</b>부터 시행됩니다.</p>
      <p>공정거래위원회 표준약관 제10078호(모바일게임 표준약관)를 기반으로 Mystic Lotto 서비스에 맞게 수정한 약관입니다.</p>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
//  개인정보처리방침 내용
// ────────────────────────────────────────────────────────────
export const PrivacyContent: React.FC = () => (
  <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
    <div className="text-center space-y-1 pb-4 border-b border-white/10">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">시행일: 2026년 3월 1일</p>
    </div>

    <p>
      미스틱로또(이하 "회사")는 「개인정보 보호법」 및 관련 법령에 따라 이용자의 개인정보를
      보호하고, 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을
      수립·공개합니다.
    </p>

    <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
      <p className="mb-3">회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-white/5">
              <Th>구분</Th>
              <Th>수집 항목</Th>
              <Th>수집 방법</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <Td>필수</Td>
              <Td>Google 계정 고유 식별자(UID), 이메일 주소, 닉네임, 프로필 사진 URL</Td>
              <Td>Google OAuth 로그인</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>선택</Td>
              <Td>이름(본명), 생년월일, 성별, 출생 도시/시간, 음력/양력 구분</Td>
              <Td>회원 직접 입력</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>자동 수집</Td>
              <Td>서비스 이용 기록, 접속 일시, 기기 정보(브라우저 종류/버전), 쿠키·로컬스토리지</Td>
              <Td>서비스 이용 중 자동 생성</Td>
            </tr>
            <tr>
              <Td>결제</Td>
              <Td>결제 수단 정보(PG사 처리, 회사는 직접 보관하지 않음), 결제 금액, 결제 일시</Td>
              <Td>결제 과정에서 PG사를 통해 수집</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>

    <Section title="2. 개인정보의 수집 및 이용 목적">
      <ul className="space-y-2 list-none">
        <Li>• 회원 식별 및 본인 확인, 서비스 이용 계약 이행</Li>
        <Li>• 맞춤형 운세·번호 추천 서비스 제공 (생년월일, 성별, 출생 도시 등 활용)</Li>
        <Li>• 서비스 내 커뮤니티 기능 운영 (닉네임, 프로필 표시 등)</Li>
        <Li>• 유료 서비스 결제 처리 및 환불 처리</Li>
        <Li>• 고객 문의 대응 및 민원 처리</Li>
        <Li>• 서비스 부정 이용 방지 및 이용 약관 위반 회원 제재</Li>
        <Li>• 서비스 개선 및 신규 서비스 개발을 위한 통계 분석</Li>
        <Li>• 법령에 의한 의무 이행</Li>
      </ul>
    </Section>

    <Section title="3. 개인정보의 보유 및 이용 기간">
      <p className="mb-3">회사는 원칙적으로 개인정보 수집·이용 목적 달성 후 즉시 파기합니다. 단, 다음의 경우 해당 기간 동안 보존합니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-white/5">
              <Th>보존 항목</Th>
              <Th>보존 기간</Th>
              <Th>근거 법령</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <Td>계약 또는 청약철회 등에 관한 기록</Td>
              <Td>5년</Td>
              <Td>전자상거래법</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>대금 결제 및 재화 공급에 관한 기록</Td>
              <Td>5년</Td>
              <Td>전자상거래법</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>소비자 불만 또는 분쟁 처리에 관한 기록</Td>
              <Td>3년</Td>
              <Td>전자상거래법</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>서비스 이용 기록, 접속 로그</Td>
              <Td>3개월</Td>
              <Td>통신비밀보호법</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>부정 이용 방지를 위한 정지 회원 정보</Td>
              <Td>1년</Td>
              <Td>회사 내부 방침</Td>
            </tr>
            <tr>
              <Td>신고 접수된 대화방 메시지 및 참여자 정보</Td>
              <Td>검토 완료 시까지 (최대 3년)</Td>
              <Td>개인정보보호법 제58조의2, 회사 내부 방침</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>

    <Section title="4. 개인정보의 제3자 제공">
      <p className="mb-2">
        회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
        다만, 다음의 경우에는 예외로 합니다.
      </p>
      <ul className="space-y-2 list-none">
        <Li>• 이용자가 사전에 동의한 경우</Li>
        <Li>• 법령에 따른 수사기관의 요청이 있는 경우</Li>
        <Li>• 서비스 제공을 위해 불가피하게 필요한 경우로서 법령이 허용하는 경우</Li>
      </ul>
    </Section>

    <Section title="5. 개인정보 처리의 위탁">
      <p className="mb-3">회사는 서비스 운영을 위해 다음과 같이 개인정보 처리를 위탁합니다.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-white/5">
              <Th>수탁자</Th>
              <Th>위탁 업무 내용</Th>
              <Th>보유·이용 기간</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <Td>Google LLC (Firebase)</Td>
              <Td>데이터베이스 저장·관리, 회원 인증, 서버 운영</Td>
              <Td>서비스 이용 기간</Td>
            </tr>
            <tr className="border-b border-white/5">
              <Td>Google LLC (Gemini AI)</Td>
              <Td>AI 운세 분석 콘텐츠 생성 (비식별 처리 후 전송)</Td>
              <Td>요청 처리 후 즉시 삭제</Td>
            </tr>
            <tr>
              <Td>결제대행사(PG사, 추후 공지)</Td>
              <Td>나디르 결제 처리</Td>
              <Td>결제 완료 후 법령에 따른 기간</Td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Google Firebase 서버는 미국에 소재합니다. 서비스 이용 동의 시 국외 이전에 동의한 것으로 간주됩니다.
      </p>
    </Section>

    <Section title="6. 정보주체의 권리·의무 및 행사 방법">
      <ul className="space-y-2 list-none">
        <Li>① 이용자는 언제든지 자신의 개인정보에 대해 <b>열람, 수정, 삭제, 처리정지</b>를 요청할 수 있습니다.</Li>
        <Li>② 개인정보 수정은 서비스 내 '개인 성소 → Identity 탭'에서 직접 수행할 수 있습니다.</Li>
        <Li>③ 회원 탈퇴(개인정보 삭제 요청)는 '개인 성소 → Identity 탭 → 계정 삭제'에서 가능합니다.</Li>
        <Li>④ 기타 개인정보 관련 문의는 아래 개인정보 보호책임자에게 연락하시기 바랍니다.</Li>
        <Li>⑤ 이용자는 개인정보 침해 신고 및 상담을 위해 다음 기관에 문의할 수 있습니다.
          <ul className="ml-4 mt-2 space-y-1 text-[11px] text-slate-400">
            <li>• 개인정보침해 신고센터: privacy.kisa.or.kr / ☎ 118</li>
            <li>• 개인정보 분쟁조정위원회: www.kopico.go.kr / ☎ 1833-6972</li>
            <li>• 대검찰청 사이버수사과: www.spo.go.kr / ☎ 1301</li>
            <li>• 경찰청 사이버안전국: cyberbureau.police.go.kr / ☎ 182</li>
          </ul>
        </Li>
      </ul>
    </Section>

    <Section title="7. 개인정보의 파기 절차 및 방법">
      <ul className="space-y-2 list-none">
        <Li>① 회원 탈퇴 또는 보유 기간 만료 시 개인정보는 지체 없이 파기합니다.</Li>
        <Li>② 전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.</Li>
        <Li>③ 법령에 의해 보존이 필요한 정보는 별도 데이터베이스로 이관 후 해당 기간 경과 시 파기합니다.</Li>
      </ul>
    </Section>

    <Section title="8. 개인정보의 안전성 확보 조치">
      <ul className="space-y-2 list-none">
        <Li>• Google Firebase 플랫폼의 암호화 전송(HTTPS/TLS) 및 저장 암호화 적용</Li>
        <Li>• Firebase Security Rules를 통한 데이터 접근 권한 제어</Li>
        <Li>• 개인정보 접근 권한 최소화 (운영 담당자로 한정)</Li>
        <Li>• 정기적인 서비스 보안 점검</Li>
      </ul>
    </Section>

    <Section title="9. 쿠키 및 로컬스토리지 사용">
      <ul className="space-y-2 list-none">
        <Li>① 서비스는 이용자 환경 설정(예: 웰컴 모달 표시 여부)을 위해 브라우저 로컬스토리지를 사용합니다.</Li>
        <Li>② 이용자는 브라우저 설정을 통해 로컬스토리지 사용을 거부할 수 있으나, 이 경우 일부 서비스 기능이 정상 동작하지 않을 수 있습니다.</Li>
      </ul>
    </Section>

    <Section title="10. 개인정보 보호책임자">
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-2 text-[12px]">
        <p><span className="text-slate-500">책임자:</span> 미스틱로또 운영팀</p>
        <p><span className="text-slate-500">이메일:</span> mysticlotto.help@gmail.com</p>
        <p className="text-slate-500 text-[11px] mt-2">개인정보 관련 문의사항이 있으실 경우 위 이메일로 연락해 주시기 바랍니다. 빠른 시일 내에 답변 드리겠습니다.</p>
      </div>
    </Section>

    <Section title="11. 개인정보처리방침의 변경">
      <p>
        본 개인정보처리방침은 법령·정책 또는 서비스 변경에 따라 수정될 수 있으며, 변경 시
        서비스 내 공지사항을 통해 최소 7일 전에 공지합니다. 다만 중요한 변경 사항의 경우
        30일 전에 공지합니다.
      </p>
    </Section>

    <div className="pt-4 border-t border-white/10 text-center text-[10px] text-slate-600">
      본 방침은 2026년 3월 1일부터 시행됩니다.
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
//  공통 문서 모달 레이아웃
// ────────────────────────────────────────────────────────────
interface LegalModalProps {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const LegalModal: React.FC<LegalModalProps> = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[9000] flex items-center justify-center px-4">
    <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
    <div className="relative w-full max-w-2xl h-[85vh] glass rounded-[2rem] border border-white/10 shadow-[0_50px_120px_rgba(0,0,0,0.9)] flex flex-col animate-in zoom-in-95 fade-in duration-300">
      {/* 고정 헤더 */}
      <div className="shrink-0 px-8 pt-7 pb-5 border-b border-white/10 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-mystic font-black text-white tracking-widest uppercase">{title}</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0 ml-4 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      {/* 스크롤 본문 */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scroll">
        {children}
      </div>
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────
//  헬퍼 컴포넌트
// ────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <h3 className="text-sm font-black text-indigo-300 tracking-wide">{title}</h3>
    <div>{children}</div>
  </div>
);

const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-slate-300">{children}</li>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="text-left p-3 text-slate-400 font-black border border-white/5">{children}</th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="p-3 text-slate-300 border border-white/5 align-top">{children}</td>
);
