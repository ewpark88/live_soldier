/**
 * 계급장 이미지 (static require).
 *
 * 파일명은 ASCII로 고정한다 — Metro 가 한글 파일명을 같은 안드로이드 리소스로
 * 충돌시켜(중위→대령 등) 엉뚱한 계급장이 뜨는 문제가 있었다. 키는 한글 계급명 유지.
 *
 * 원래 HomeScreen 안에만 있었는데, 봉급표/로드맵도 같은 계급장을 쓴다.
 * 이모지(🪖⭐👑)나 일반 아이콘보다 실제 금속 계급장이 훨씬 낫고, 이미 있는 에셋이다.
 */

/** 병사 */
export const SOLDIER_RANK_IMAGES = {
  이병: require('../../assets/ranks/ibyeong.png'),
  일병: require('../../assets/ranks/ilbyeong.png'),
  상병: require('../../assets/ranks/sangbyeong.png'),
  병장: require('../../assets/ranks/byeongjang.png'),
};

/** 간부 (부사관·장교) */
export const OFFICER_RANK_IMAGES = {
  하사: require('../../assets/ranks/hasa.png'),
  중사: require('../../assets/ranks/jungsa.png'),
  상사: require('../../assets/ranks/sangsa.png'),
  원사: require('../../assets/ranks/wonsa.png'),
  소위: require('../../assets/ranks/sowi.png'),
  중위: require('../../assets/ranks/jungwi.png'),
  대위: require('../../assets/ranks/daewi.png'),
  소령: require('../../assets/ranks/soryeong.png'),
  중령: require('../../assets/ranks/jungryeong.png'),
  대령: require('../../assets/ranks/daeryeong.png'),
};

export const RANK_IMAGES = { ...SOLDIER_RANK_IMAGES, ...OFFICER_RANK_IMAGES };

/** 계급명 → 계급장 이미지 (없으면 null) */
export function rankImage(rank) {
  return RANK_IMAGES[rank] || null;
}
