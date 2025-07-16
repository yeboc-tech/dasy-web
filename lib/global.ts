export const sampleProblems = [
  {
    id: 1,
    image: "/problems/통합사회_1권_1단원_2/문제1_하.png"
  },
  {
    id: 2,
    image: "/problems/통합사회_1권_1단원_2/문제2_하.png"
  },
  {
    id: 3,
    image: "/problems/통합사회_1권_1단원_2/문제3_하.png"
  },
  {
    id: 4,
    image: "/problems/통합사회_1권_1단원_2/문제4_하.png"
  },
  {
    id: 5,
    image: "/problems/통합사회_1권_1단원_2/문제5_하.png"
  },
  {
    id: 6,
    image: "/problems/통합사회_1권_1단원_2/문제6_하.png"
  },
  {
    id: 7,
    image: "/problems/통합사회_1권_1단원_2/문제7_하.png"
  },
  {
    id: 8,
    image: "/problems/통합사회_1권_1단원_2/문제8_하.png"
  }
];

export const contentTree = [
  {
    id: 'integrated-perspective',
    label: 'I. 통합적 관점',
    type: 'category',
    expanded: true,
    children: [
      {
        id: 'perspectives',
        label: '01. 인간, 사회, 환경을 바라보는 다양한 관점',
        type: 'category',
        expanded: true,
        children: [
          {
            id: 'temporal-perspective',
            label: '[1] 시간적 관점',
            type: 'item',
            expanded: false,
          },
          {
            id: 'spatial-perspective',
            label: '[2] 공간적 관점',
            type: 'item',
            expanded: false,
          },
          {
            id: 'social-perspective',
            label: '[3] 사회적 관점',
            type: 'item',
            expanded: false,
          },
          {
            id: 'ethical-perspective',
            label: '[4] 윤리적 관점',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'integrated-exploration',
        label: '02. 인간, 사회, 환경의 통합적 탐구',
        type: 'category',
        expanded: true,
        children: [
          {
            id: 'integrated-view',
            label: '[1] 통합적 관점',
            type: 'item',
            expanded: false,
          },
          {
            id: 'integrated-application',
            label: '[2] 통합적 관점의 적용 사례',
            type: 'item',
            expanded: false,
          },
        ],
      },
    ],
  },
  {
    id: 'happiness',
    label: 'II. 인간, 사회, 환경과 행복',
    type: 'category',
    expanded: true,
    children: [
      {
        id: 'happiness-standards',
        label: '01. 행복의 기준과 의미',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'happiness-meaning',
            label: '[1] 행복의 의미',
            type: 'item',
            expanded: false,
          },
          {
            id: 'happiness-standards',
            label: '[2] 행복의 기준',
            type: 'item',
            expanded: false,
          },
          {
            id: 'true-happiness',
            label: '[3] 삶의 목적으로서의 행복과 진정한 행복',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'happiness-conditions',
        label: '02. 행복한 삶을 실현하기 위한 조건',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'quality-environment',
            label: '[1] 질 높은 정주 환경',
            type: 'item',
            expanded: false,
          },
          {
            id: 'economic-stability',
            label: '[2] 경제적 안정',
            type: 'item',
            expanded: false,
          },
          {
            id: 'democracy-development',
            label: '[3] 민주주의의 발전',
            type: 'item',
            expanded: false,
          },
          {
            id: 'moral-practice',
            label: '[4] 도덕적 실천',
            type: 'item',
            expanded: false,
          },
        ],
      },
    ],
  },
  {
    id: 'natural-environment',
    label: 'III. 자연환경과 인간 생활',
    type: 'category',
    expanded: true,
    children: [
      {
        id: 'environment-life',
        label: '01. 자연환경과 인간 생활',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'environmental-impact',
            label: '[1] 자연환경이 인간 생활에 끼치는 영향',
            type: 'item',
            expanded: false,
          },
          {
            id: 'safety-rights',
            label: '[2] 시민의 안전할 권리',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'human-nature-relationship',
        label: '02. 인간과 자연의 관계',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'nature-perspectives',
            label: '[1] 자연에 대한 다양한 관점',
            type: 'item',
            expanded: false,
          },
          {
            id: 'ideal-relationship',
            label: '[2] 인간과 자연의 바람직한 관계',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'environmental-solutions',
        label: '03. 환경 문제 해결을 위한 방안',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'environmental-causes',
            label: '[1] 환경 문제의 발생 원인과 특징',
            type: 'item',
            expanded: false,
          },
          {
            id: 'environmental-problems',
            label: '[2] 다양한 환경 문제와 주요 국제 협약',
            type: 'item',
            expanded: false,
          },
          {
            id: 'environmental-solutions',
            label: '[3] 환경 문제 해결을 위한 방안',
            type: 'item',
            expanded: false,
          },
        ],
      },
    ],
  },
  {
    id: 'culture-diversity',
    label: 'IV. 문화와 다양성',
    type: 'category',
    expanded: true,
    children: [
      {
        id: 'cultural-regions',
        label: '01. 다양한 문화권과 삶의 방식',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'culture-cultural-regions',
            label: '[1] 문화와 문화권',
            type: 'item',
            expanded: false,
          },
          {
            id: 'cultural-factors',
            label: '[2] 문화권 형성에 영향을 주는 요인',
            type: 'item',
            expanded: false,
          },
          {
            id: 'cultural-characteristics',
            label: '[3] 다양한 문화권의 특징과 삶의 방식',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'cultural-change',
        label: '02. 문화 변동과 전통문화',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'cultural-change-meaning',
            label: '[1] 문화 변동의 의미와 요인',
            type: 'item',
            expanded: false,
          },
          {
            id: 'cultural-change-aspects',
            label: '[2] 문화 변동의 양상',
            type: 'item',
            expanded: false,
          },
          {
            id: 'traditional-culture',
            label: '[3] 전통문화의 창조적 계승',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'cultural-relativism',
        label: '03. 문화 상대주의와 보편 윤리',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'cultural-differences',
            label: '[1] 문화적 차이',
            type: 'item',
            expanded: false,
          },
          {
            id: 'understanding-attitude',
            label: '[2] 문화적 차이를 이해하는 태도',
            type: 'item',
            expanded: false,
          },
          {
            id: 'universal-ethics',
            label: '[3] 보편 윤리와 문화 이해',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'multicultural-society',
        label: '04. 다문화 사회와 문화 다양성',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'multicultural-change',
            label: '[1] 다문화 사회로의 변화',
            type: 'item',
            expanded: false,
          },
          {
            id: 'multicultural-impact',
            label: '[2] 다문화 사회가 우리나라에 미치는 영향',
            type: 'item',
            expanded: false,
          },
          {
            id: 'conflict-resolution',
            label: '[3] 다문화 사회의 갈등 해결 노력',
            type: 'item',
            expanded: false,
          },
        ],
      },
    ],
  },
  {
    id: 'living-space-society',
    label: 'V. 생활 공간과 사회',
    type: 'category',
    expanded: true,
    children: [
      {
        id: 'industrialization-urbanization',
        label: '01. 산업화와 도시화',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'industrialization-urbanization',
            label: '[1] 산업화와 도시화',
            type: 'item',
            expanded: false,
          },
          {
            id: 'industrialization-changes',
            label: '[2] 산업화와 도시화에 따른 변화',
            type: 'item',
            expanded: false,
          },
          {
            id: 'industrialization-problems',
            label: '[3] 산업화와 도시화로 인한 문제와 해결 방안',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'transportation-communication',
        label: '02. 교통·통신 및 과학 기술의 발달과 영향',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'technology-changes',
            label: '[1] 교통·통신 및 과학 기술의 발달에 따른 변화',
            type: 'item',
            expanded: false,
          },
          {
            id: 'technology-problems',
            label: '[2] 교통·통신 및 과학 기술의 발달에 따른 문제점과 해결 방안',
            type: 'item',
            expanded: false,
          },
        ],
      },
      {
        id: 'regional-changes',
        label: '03. 우리 지역의 공간 변화',
        type: 'category',
        expanded: false,
        children: [
          {
            id: 'regional-changes',
            label: '[1] 우리 지역의 변화',
            type: 'item',
            expanded: false,
          },
          {
            id: 'regional-problems',
            label: '[2] 지역 문제의 발생과 지역 조사',
            type: 'item',
            expanded: false,
          },
        ],
      },
    ],
  },
];
