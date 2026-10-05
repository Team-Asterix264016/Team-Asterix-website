/**
 * introHandoff
 * A one-value channel between IntroScrollSequence and Car3DCanvas.
 *
 * The intro ends by dissolving its frame sequence into the live 3D scene behind
 * it. For that to read as one continuous shot rather than two clips butted
 * together, the 3D buggy has to be sitting where the footage left off at the
 * moment the dissolve starts, then travel to its hero mark as the dissolve
 * completes.
 *
 * The two components are siblings under different parents and this value
 * changes on every scroll frame, so routing it through React state or context
 * would re-render the whole background tree at scroll rate. It is a plain
 * mutable object: the intro writes, the render loop reads.
 *
 *   0 = footage fully in charge, buggy posed to match the closing frame
 *   1 = handoff complete, buggy on its normal scroll-driven keyframe track
 */
export const introHandoff = {
    /** Eased 0..1 progress through the dissolve. */
    progress: 1,

    /** False until the intro mounts, so pages without it behave normally. */
    active: false
};

export const resetIntroHandoff = () => {
    introHandoff.progress = 1;
    introHandoff.active = false;
};
