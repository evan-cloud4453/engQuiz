// 시간 배분: 총 60분 (3600초)
// Part 1(15): 8분, Part 2(15): 7분, Part 3(10): 5분, Part 4(30): 15분, Part 5(15): 9분, Part 6(15): 16분

const DEFAULT_PARTS_INFO = [
    { title: "Part 1. 단순 의미 파악", timeLimit: 480, instruction: "제시된 영단어의 정확한 뜻을 고르시오.", example: { q: "inadvertently", options: ["(A) 꼼꼼하게", "(B) 점차로", "(C) 무심코", "(D) 주목할 만하게"], answer: "(C) 무심코" } },
    { title: "Part 2. 문맥상 단어...", timeLimit: 420, instruction: "빈칸에 알맞은 단어를 고르시오.", example: { q: "The hotel can easily a----- a large tour group.", options: ["(A) accommodate", "(B) maintenance"], answer: "(A) accommodate" } },
    { title: "Part 3. 품사/의미 파악", timeLimit: 300, instruction: "제시된 단어의 정확한 품사와 뜻을 고르시오. (명사: n. / 동사: v. / 형용사: adj. / 부사: ad.)", example: { q: "consistently", options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) ad. 지속적으로, 일관되게"], answer: "(D) ad. 지속적으로, 일관되게" }},
    { title: "Part 4. 실전 문맥 파악", timeLimit: 900, instruction: "다음 문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.", example: { q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.", options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"], answer: "(B) spaciously" }},
    { title: "Part 5. 철자 배열 (Scramble)", timeLimit: 540, instruction: "제시된 한글 뜻과 무작위로 섞인 알파벳 단서를 보고, 올바른 영단어 철자를 <b>직접 타이핑</b> 하시오.", example: { q: "할당하다, 배정하다", answer: "allocate" }},
    { title: "Part 6. 철자 입력 주관식", timeLimit: 960, instruction: "해석과 첫 글자 단서를 보고, 문맥에 맞는 단어를 <b>정확한 철자로</b> 입력하시오.", example: { q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)", answer: "promoted" }}
];

// 서버에서 불러다 쓸 수 있도록 내보내기
module.exports = { DEFAULT_PARTS_INFO };

let partsInfo = [
    {
        title: "Part 1. 단순 의미 파악", timeLimit: 480,
        instruction: "제시된 영단어의 정확한 뜻을 고르시오.",
        example: { q: "inadvertently", options: ["(A) 꼼꼼하게, 세심하게", "(B) 점차로, 서서히", "(C) 무심코, 부주의하게", "(D) 주목할 만하게"], answer: "(C) 무심코, 부주의하게" },
        questions: [
            { q: "meticulously", options: ["(A) 완전히, 전부 합하여", "(B) 꼼꼼하게, 세심하게", "(C) 합작으로", "(D) 압도적으로"], answer: "(B) 꼼꼼하게, 세심하게" },
            { q: "deliberate", options: ["(A) 임시의, 일시적인", "(B) 고의의, 신중한", "(C) 전도유망한", "(D) 임박한"], answer: "(B) 고의의, 신중한" },
            { q: "consecutively", options: ["(A) 연속하여", "(B) 일관되게", "(C) 즉각, 신속히", "(D) 주로, 무엇보다도 먼저"], answer: "(A) 연속하여" },
            { q: "fluctuation", options: ["(A) 변동, 불안정", "(B) 평가", "(C) 재고 목록", "(D) 주의 산만, 방해물"], answer: "(A) 변동, 불안정" },
            { q: "initiative", options: ["(A) 수단, 방법", "(B) 혜택, 이익", "(C) 새로운 계획, 주도권", "(D) 예방책"], answer: "(C) 새로운 계획, 주도권" },
            { q: "endorse", options: ["(A) 지지하다, 보증하다", "(B) 분리하다, 구분하다", "(C) 지정하다, 임명하다", "(D) 능력이 뛰어나다"], answer: "(A) 지지하다, 보증하다" },
            { q: "delegate", options: ["(A) 위임하다", "(B) 포기하다", "(C) 할당하다", "(D) 상의하다"], answer: "(A) 위임하다" },
            { q: "streamline", options: ["(A) 환불하다", "(B) 간소화하다, 능률적으로 하다", "(C) 초과하다", "(D) 처리하다"], answer: "(B) 간소화하다, 능률적으로 하다" },
            { q: "preliminary", options: ["(A) 예비의", "(B) 임박한", "(C) 뛰어난, 미납의", "(D) 면제되는"], answer: "(A) 예비의" },
            { q: "proficiency", options: ["(A) 잠재력, 가능성", "(B) 능숙, 숙련도", "(C) 평판, 명성", "(D) 품질 보증서"], answer: "(B) 능숙, 숙련도" },
            { q: "accommodate", options: ["(A) 앞지르다", "(B) 지탱하다", "(C) (사람·의견을) 수용하다", "(D) 방해하다"], answer: "(C) (사람·의견을) 수용하다" },
            { q: "prohibit", options: ["(A) 수용하다", "(B) 교체하다", "(C) 금지하다", "(D) 미연에 방지하다"], answer: "(C) 금지하다" },
            { q: "impending", options: ["(A) 호환이 되는", "(B) 임박한, 곧 일어날", "(C) 거리가 떨어진", "(D) 헌신적인"], answer: "(B) 임박한, 곧 일어날" },
            { q: "thrive", options: ["(A) 번창하다, 성장하다", "(B) 나타나다", "(C) 확립하다", "(D) 반사하다"], answer: "(A) 번창하다, 성장하다" },
            { q: "abundant", options: ["(A) 뛰어난", "(B) 적절한", "(C) 충분한, 넘치는", "(D) 간략한"], answer: "(C) 충분한, 넘치는" }
        ]
    },
    {
        title: "Part 2. 동의어/반의어 파악", timeLimit: 420,
        instruction: "다음 중 짝지어진 단어의 관계(동의어/반의어)가 <b>나머지 셋과 다른 하나</b>를 고르시오.",
        example: { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) abandon - give up", "(B) reduce - decrease", "(C) expand - contract", "(D) distinguish - differentiate"], answer: "(C) expand - contract" },
        questions: [
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) temporary - permanent", "(B) reduce - decrease", "(C) distinguish - differentiate", "(D) abandon - give up"], answer: "(A) temporary - permanent" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) thorough - rigorous", "(B) brief - concise", "(C) reliable - dependable", "(D) valid - invalid"], answer: "(D) valid - invalid" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) completely - partially", "(B) gradually - abruptly", "(C) exclusively - entirely", "(D) remote - nearby"], answer: "(C) exclusively - entirely" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) affordable - reasonable", "(B) capable - incapable", "(C) familiar - unfamiliar", "(D) accept - reject"], answer: "(A) affordable - reasonable" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) yield - produce", "(B) assess - evaluate", "(C) forbid - permit", "(D) outline - brief"], answer: "(C) forbid - permit" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) promptly - instantly", "(B) correctly - inaccurately", "(C) consistently - constantly", "(D) primarily - mainly"], answer: "(B) correctly - inaccurately" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) appropriate - suitable", "(B) aware - conscious", "(C) impending - imminent", "(D) deliberate - accidental"], answer: "(D) deliberate - accidental" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) decline - decrease", "(B) defect - flaw", "(C) outcome - cause", "(D) estimate - quotation"], answer: "(C) outcome - cause" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) interval - continuation", "(B) obstacle - barrier", "(C) origin - source", "(D) practice - convention"], answer: "(A) interval - continuation" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) allocate - assign", "(B) comply - adhere to", "(C) clarify - confuse", "(D) conduct - carry out"], answer: "(C) clarify - confuse" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) embrace - reject", "(B) enhance - improve", "(C) ensure - guarantee", "(D) establish - found"], answer: "(A) embrace - reject" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) launch - terminate", "(B) excel - surpass", "(C) extend - prolong", "(D) handle - deal with"], answer: "(A) launch - terminate" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) independently - separately", "(B) individually - personally", "(C) meticulously - carelessly", "(D) notably - markedly"], answer: "(C) meticulously - carelessly" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) abundant - sufficient", "(B) accomplished - distinguished", "(C) adaptable - rigid", "(D) eligible - qualified"], answer: "(C) adaptable - rigid" },
            { q: "다음 중 단어의 관계가 나머지 셋과 다른 하나를 고르시오.", options: ["(A) lease - rent", "(B) notify - inform", "(C) operate - function", "(D) retain - abandon"], answer: "(D) retain - abandon" }
        ]
    },
    {
        title: "Part 3. 품사/의미 파악", timeLimit: 300,
        instruction: "제시된 단어의 정확한 품사와 뜻을 고르시오. (명사: n. / 동사: v. / 형용사: adj. / 부사: ad.)",
        example: { q: "consistently", options: ["(A) adj. 지속적인", "(B) n. 일관성", "(C) v. 구성되다", "(D) ad. 지속적으로, 일관되게"], answer: "(D) ad. 지속적으로, 일관되게" },
        questions: [
            { q: "alternative", options: ["(A) n. 대안", "(B) v. 번갈아 하다", "(C) ad. 대안적으로", "(D) adj. 변경할 수 있는"], answer: "(A) n. 대안" },
            { q: "implement", options: ["(A) n. 암시, 함축", "(B) v. 시행하다, 이행하다", "(C) adj. 임박한", "(D) ad. 즉각, 신속히"], answer: "(B) v. 시행하다, 이행하다" },
            { q: "affordable", options: ["(A) adj. 적정한 가격의", "(B) v. ~할 여유가 있다", "(C) n. 혜택", "(D) ad. 상대적으로"], answer: "(A) adj. 적정한 가격의" },
            { q: "evaluate", options: ["(A) adj. 유효한", "(B) n. 평가", "(C) v. 평가하다", "(D) ad. 효율적으로"], answer: "(C) v. 평가하다" },
            { q: "expansion", options: ["(A) v. 확대하다", "(B) n. 확대, 확장", "(C) adj. 광범위한", "(D) ad. 독점적으로"], answer: "(B) n. 확대, 확장" },
            { q: "competitive", options: ["(A) v. 경쟁하다", "(B) n. 경쟁", "(C) adj. 경쟁의, 경쟁력이 있는", "(D) ad. 비교적"], answer: "(C) adj. 경쟁의, 경쟁력이 있는" },
            { q: "eligible", options: ["(A) v. 지정하다", "(B) n. 예외", "(C) adj. 적격의, 자격이 있는", "(D) ad. 몹시"], answer: "(C) adj. 적격의, 자격이 있는" },
            { q: "revision", options: ["(A) v. 수정하다", "(B) n. 수정, 개정", "(C) adj. 임시의", "(D) ad. 서서히"], answer: "(B) n. 수정, 개정" },
            { q: "dramatically", options: ["(A) v. 극화하다", "(B) n. 연극", "(C) adj. 극적인", "(D) ad. 극적으로"], answer: "(D) ad. 극적으로" },
            { q: "exclusively", options: ["(A) v. 배제하다", "(B) n. 제외", "(C) adj. 독점적인", "(D) ad. 독점적으로, 전적으로"], answer: "(D) ad. 독점적으로, 전적으로" }
        ]
    },
    {
        title: "Part 4. 실전 문맥 파악", timeLimit: 900,
        instruction: "다음 문장의 빈칸에 들어갈 가장 알맞은 어휘를 고르시오.",
        example: { q: "Property taxes in Granville, a relatively new, ----- area, are higher than in Powerton.", options: ["(A) considerably", "(B) spaciously", "(C) diligently", "(D) expertly"], answer: "(B) spaciously" },
        questions: [
            { q: "The management appreciates how ----- the company's security officers are.", options: ["(A) best", "(B) helpful", "(C) forward", "(D) promoted"], answer: "(B) helpful" },
            { q: "Davila's Café is ----- for its desserts made from scratch in the restaurant.", options: ["(A) delicious", "(B) generous", "(C) curious", "(D) famous"], answer: "(D) famous" },
            { q: "The registration period for the Vernon Street Marathon has been ----- to March 31.", options: ["(A) extended", "(B) participated", "(C) bought", "(D) claimed"], answer: "(A) extended" },
            { q: "After ten years in the marketing department, Ms. Quinn was ----- promoted to director.", options: ["(A) mostly", "(B) thickly", "(C) hardly", "(D) finally"], answer: "(D) finally" },
            { q: "Hire the professionals at Glenstone Restoration for your next exterior paint -----.", options: ["(A) project", "(B) flavor", "(C) material", "(D) brush"], answer: "(A) project" },
            { q: "Ecology Soaps produces a broad ----- of all-natural bath products.", options: ["(A) appeal", "(B) variety", "(C) sense", "(D) band"], answer: "(B) variety" },
            { q: "The Brades Swim Center is ----- closed for renovations.", options: ["(A) greatly", "(B) loosely", "(C) temporarily", "(D) busily"], answer: "(C) temporarily" },
            { q: "Fordham Stationers recently decided to switch suppliers because Valley Paper has been ------- late in shipping their orders.", options: ["(A) steadily", "(B) sensibly", "(C) exactly", "(D) consistently"], answer: "(D) consistently" },
            { q: "Initial projections of quarterly earnings have already been ----- with a month still remaining.", options: ["(A) exceeded", "(B) outdated", "(C) overdrawn", "(D) impressed"], answer: "(A) exceeded" },
            { q: "Small businesses should ------- taking out low-interest loans from Greyhound Bank.", options: ["(A) aim", "(B) observe", "(C) persuade", "(D) consider"], answer: "(D) consider" },
            { q: "Ms. Gomez has been ----- to the business office to assist with payroll tasks.", options: ["(A) transformed", "(B) registered", "(C) involved", "(D) transferred"], answer: "(D) transferred" },
            { q: "Sports fans around the world ----- await the results of the annual tennis championship.", options: ["(A) perfectly", "(B) evenly", "(C) rapidly", "(D) eagerly"], answer: "(D) eagerly" },
            { q: "The terms and conditions outlined in this document are ----- to change without notice.", options: ["(A) dependent", "(B) subject", "(C) immediate", "(D) final"], answer: "(B) subject" },
            { q: "Sign up now for deals available ----- to Platinum members of the Bordner Gym Club.", options: ["(A) exclusively", "(B) financially", "(C) relatively", "(D) productively"], answer: "(A) exclusively" },
            { q: "The Wellborn Science Museum's new astronomy theater has a seating ------- of 250.", options: ["(A) aptitude", "(B) capacity", "(C) demonstration", "(D) compliance"], answer: "(B) capacity" },
            { q: "Wyncote Airlines has announced that it will ----- the £15 baggage fee for members of its Sky Flyer Club.", options: ["(A) prove", "(B) cost", "(C) waive", "(D) align"], answer: "(C) waive" },
            { q: "The accounting department has ----- a new policy in order to decrease paper usage.", options: ["(A) preoccupied", "(B) represented", "(C) characterized", "(D) implemented"], answer: "(D) implemented" },
            { q: "Fales Bookstores reported a 20 percent decrease in net profit this year, which the company ----- to fierce competition from Yule Booksellers, Inc.", options: ["(A) accused", "(B) presented", "(C) disapproved", "(D) attributed"], answer: "(D) attributed" },
            { q: "In my opinion, the company's stock price is ----- low compared to its annual earnings.", options: ["(A) audibly", "(B) relatively", "(C) plentifully", "(D) anonymously"], answer: "(B) relatively" },
            { q: "The Fitzton Gallery has been the ----- promoter of the arts in Worthington, sponsoring numerous public events.", options: ["(A) precise", "(B) separate", "(C) certain", "(D) primary"], answer: "(D) primary" },
            { q: "All new hire paperwork must be filled out and submitted to human resources ----- by the end of the business day.", options: ["(A) lately", "(B) overly", "(C) completely", "(D) hardly"], answer: "(C) completely" },
            { q: "Rain fell ----- throughout the night, providing a welcome relief from the recent dry spell.", options: ["(A) continuously", "(B) mutually", "(C) needlessly", "(D) optimistically"], answer: "(A) continuously" },
            { q: "Employees are ----- to take family and medical leave if they have been employed for at least twelve months.", options: ["(A) eligible", "(B) desirable", "(C) preferred", "(D) suitable"], answer: "(A) eligible" },
            { q: "Use of this Web site implies ----- with our terms and conditions.", options: ["(A) contentment", "(B) agreement", "(C) placement", "(D) development"], answer: "(B) agreement" },
            { q: "Mild weather is ----- to continue throughout the week, with a chance of light rain on Thursday.", options: ["(A) probable", "(B) frequent", "(C) considerable", "(D) likely"], answer: "(D) likely" },
            { q: "The ----- installed solar array in Amarillo is expected to produce 50,000 kilowatt hours of electricity annually.", options: ["(A) shortly", "(B) recently", "(C) commonly", "(D) increasingly"], answer: "(B) recently" },
            { q: "Heston Property Management apologizes for any ----- that the current renovation work may cause to our tenants.", options: ["(A) resolution", "(B) inconvenience", "(C) improvement", "(D) distinction"], answer: "(B) inconvenience" },
            { q: "Business analysts expect the ----- merger decision to be made soon by Jemquist Ltd.", options: ["(A) sparse", "(B) related", "(C) pending", "(D) attentive"], answer: "(C) pending" },
            { q: "Dr. Okada of Sendai Labs has received the ----- Lowery Award for pharmaceutical research.", options: ["(A) enhanced", "(B) determined", "(C) prestigious", "(D) energetic"], answer: "(C) prestigious" },
            { q: "Because Oswalt International has completed over 200 development projects -------, its services are now in high demand.", options: ["(A) successfully", "(B) instantly", "(C) financially", "(D) hugely"], answer: "(A) successfully" }
        ]
    },
    {
        title: "Part 5. 철자 배열 (Scramble)", timeLimit: 540,
        instruction: "제시된 한글 뜻과 무작위로 섞인 알파벳 단서를 보고, 올바른 영단어 철자를 <b>직접 타이핑</b> 하시오.",
        example: { q: "할당하다, 배정하다", answer: "allocate" },
        questions: [
            { q: "호환이 되는, 화합할 수 있는", answer: "compatible" },
            { q: "철저한, 빈틈없는", answer: "thorough" },
            { q: "따르다, 지키다", answer: "comply" },
            { q: "구별하다", answer: "distinguish" },
            { q: "강화하다, 향상시키다", answer: "enhance" },
            { q: "만료하다, 기한이 되다", answer: "expire" },
            { q: "자원, 재산", answer: "resource" },
            { q: "승진, 홍보", answer: "promotion" },
            { q: "능숙, 숙련도", answer: "proficiency" },
            { q: "전도유망한, 장래가 밝은", answer: "promising" },
            { q: "몹시, 극도로", answer: "extremely" },
            { q: "관대히, 후하게", answer: "generously" },
            { q: "주기적으로, 정기적으로", answer: "periodically" },
            { q: "보장하다, 확실하게 하다", answer: "ensure" },
            { q: "즉흥적으로 하다", answer: "improvise" }
        ]
    },
    {
        title: "Part 6. 철자 입력 주관식", timeLimit: 960,
        instruction: "해석과 첫 글자 단서를 보고, 문맥에 맞는 단어를 <b>정확한 철자로</b> 입력하시오.",
        example: { q: "After ten years in the marketing department, Ms. Quinn was finally p----- to director.\n(해석: 마케팅 부서에서 10년을 보낸 후, 퀸 씨는 마침내 이사로 승진되었습니다.)", answer: "promoted" },
        questions: [
            { q: "The Brades Swim Center is t----- closed for renovations.\n(해석: 브레이드 수영 센터는 개조 공사를 위해 일시적으로 문을 닫습니다.)", answer: "temporarily" },
            { q: "Valley Paper has been c----- late in shipping their orders.\n(해석: 밸리 페이퍼가 주문을 배송하는 데 지속적으로 늦었기 때문입니다.)", answer: "consistently" },
            { q: "Sign up now for deals available e----- to Platinum members of the Bordner Gym Club.\n(해석: 보드너 짐 클럽의 플래티넘 회원들에게 독점적으로 제공되는 특가 상품에 가입하세요.)", answer: "exclusively" },
            { q: "The registration period for the Vernon Street Marathon has been e----- to March 31.\n(해석: 버논 스트리트 마라톤의 등록 기간이 3월 31일까지 연장되었습니다.)", answer: "extended" },
            { q: "Mr. Vance concluded that more e----- should be placed on networking skills.\n(해석: 밴스 씨는 네트워킹 기술에 더 많은 강조를 두어야 한다고 결론지었습니다.)", answer: "emphasis" },
            { q: "All machines be inspected if more than five d----- items are found in a single day.\n(해석: 하루에 5개 이상의 결함이 있는 품목이 발견되면 모든 기계를 검사해야 합니다.)", answer: "defective" },
            { q: "A precise combination of the various i----- is necessary.\n(해석: 세척 화합물이 효과적이려면 다양한 성분(재료)들의 정확한 조합이 필요합니다.)", answer: "ingredients" },
            { q: "Pratique Lawn sells top-quality gardening supplies at a----- prices.\n(해석: 프라티크 론은 최고 품질의 원예 용품을 적정한 가격에 판매합니다.)", answer: "affordable" },
            { q: "Danner Corporation met its recruitment goals for the third c----- year.\n(해석: 대너 코퍼레이션은 3년 연속 채용 목표를 달성했습니다.)", answer: "consecutive" },
            { q: "The general manager will o----- the domestic sales team.\n(해석: 총괄 매니저가 국내 영업팀을 감독할 것입니다.)", answer: "oversee" },
            { q: "The hotel can easily a----- a large tour group.\n(해석: 그 호텔은 대규모 단체 관광객을 쉽게 수용할 수 있습니다.)", answer: "accommodate" },
            { q: "The software systems will undergo routine m----- this weekend.\n(해석: 소프트웨어 시스템은 이번 주말에 정기적인 유지 보수를 거칠 것입니다.)", answer: "maintenance" },
            { q: "The firm strives to maintain a good r----- among local consumers.\n(해석: 그 회사는 지역 소비자들 사이에서 좋은 평판을 유지하기 위해 노력합니다.)", answer: "reputation" },
            { q: "The accountant i----- made a mistake while entering the data.\n(해석: 그 회계사는 데이터를 입력하는 동안 무심코 부주의하게 실수를 저질렀습니다.)", answer: "inadvertently" },
            { q: "The manual will s----- the date of delivery.\n(해석: 설명서는 배송 날짜를 상세히 말할(명시할) 것입니다.)", answer: "specify" }
        ]
    }
];
