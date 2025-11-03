import type { MeditationConfig } from '../App';

export interface MeditationPhase {
  title: string;
  guidance: string;
  breathingPattern?: string;
}

export interface MeditationScript {
  introduction: string;
  phases: MeditationPhase[];
  closing: string;
}

export function generateMeditationScript(config: MeditationConfig): MeditationScript {
  const { purpose, duration, posture } = config;

  // Posture-specific introductions
  const postureIntros = {
    sitting: 'Find a comfortable seated position with your spine naturally aligned. Allow your shoulders to relax.',
    lying: 'Lie down comfortably on your back. Let your arms rest naturally by your sides, palms facing up.',
    walking: 'Begin walking at a slow, natural pace. Feel the ground beneath each step.',
    standing: 'Stand with your feet hip-width apart. Feel rooted and grounded through your feet.',
  };

  // Purpose-specific content
  const purposeContent = {
    focus: {
      intro: 'This meditation will help sharpen your mental clarity and enhance your concentration.',
      phases: [
        {
          title: 'Settling In',
          guidance: 'Close your eyes gently. Notice the feeling of your body making contact with the surface beneath you. Take a moment to arrive fully in this space.',
          breathingPattern: 'Breathe naturally',
        },
        {
          title: 'Breath Awareness',
          guidance: 'Bring your attention to your breath. Notice the cool air entering your nostrils and the warm air leaving. If your mind wanders, gently guide it back to your breath.',
          breathingPattern: 'Inhale for 4 counts, exhale for 4 counts',
        },
        {
          title: 'Mental Clarity',
          guidance: 'Imagine your mind as a clear blue sky. Thoughts are clouds passing through. Observe them without attachment, letting them drift away.',
          breathingPattern: 'Deep, steady breaths',
        },
        {
          title: 'Focused Intention',
          guidance: 'With each breath, feel your mind becoming sharper and more focused. Visualize yourself accomplishing your tasks with clarity and precision.',
        },
        {
          title: 'Integration',
          guidance: 'Slowly bring gentle movement to your fingers and toes. When you\'re ready, open your eyes, carrying this clarity with you.',
        },
      ],
    },
    'stress-relief': {
      intro: 'This meditation guides you to release tension and find your natural state of calm.',
      phases: [
        {
          title: 'Arriving',
          guidance: 'Allow yourself to simply be here. There\'s nothing you need to do, nowhere you need to be. This time is yours.',
          breathingPattern: 'Natural breathing',
        },
        {
          title: 'Body Scan',
          guidance: 'Notice any areas of tension in your body. Without judgment, simply observe. Start from your forehead, moving down through your jaw, shoulders, and entire body.',
        },
        {
          title: 'Release & Let Go',
          guidance: 'With each exhale, imagine tension melting away like ice in warm water. Feel your muscles softening, your mind quieting.',
          breathingPattern: 'Inhale peace, exhale tension',
        },
        {
          title: 'Safe Space',
          guidance: 'Visualize a place where you feel completely safe and at peace. Notice the details—the colors, sounds, and how it makes you feel.',
        },
        {
          title: 'Return',
          guidance: 'Gradually bring your awareness back to the present. Feel grateful for this moment of peace you\'ve given yourself.',
        },
      ],
    },
    sleep: {
      intro: 'Allow this meditation to guide you into deep, restful sleep.',
      phases: [
        {
          title: 'Settling Down',
          guidance: 'Make yourself completely comfortable. Give yourself permission to let go of the day. Everything you needed to do today is done.',
          breathingPattern: 'Soft, gentle breaths',
        },
        {
          title: 'Progressive Relaxation',
          guidance: 'Starting with your feet, consciously relax each part of your body. Feel a wave of heaviness and warmth moving through you.',
          breathingPattern: 'Slow, deep breaths—inhale for 4, exhale for 6',
        },
        {
          title: 'Drifting',
          guidance: 'Your body is becoming heavier with each breath. Your mind is becoming quieter. Like a leaf floating on still water, you are gently drifting.',
        },
        {
          title: 'Deep Rest',
          guidance: 'There is nothing to do, nothing to think about. Simply allow yourself to sink deeper into rest. Your only job now is to sleep.',
          breathingPattern: 'Natural, effortless breathing',
        },
      ],
    },
    energy: {
      intro: 'This meditation will help awaken your natural vitality and revitalize your spirit.',
      phases: [
        {
          title: 'Grounding',
          guidance: 'Feel your connection to the earth beneath you. Imagine roots extending down from your body, drawing up energy from the ground.',
          breathingPattern: 'Deep, energizing breaths',
        },
        {
          title: 'Awakening Breath',
          guidance: 'With each inhale, imagine breathing in bright, golden light. Feel it filling your entire body with warmth and energy.',
          breathingPattern: 'Inhale for 4, hold for 2, exhale for 4',
        },
        {
          title: 'Vitality Rising',
          guidance: 'Notice energy beginning to flow through you. Feel it in your chest, your arms, your legs. You are alive and vibrant.',
        },
        {
          title: 'Radiating Energy',
          guidance: 'Imagine yourself as a source of light and energy. Feel this vitality radiating out from your center to every cell of your body.',
        },
        {
          title: 'Ready',
          guidance: 'Begin to stretch gently. Feel your renewed energy. When you open your eyes, carry this vitality into your day.',
        },
      ],
    },
    anxiety: {
      intro: 'This meditation offers you a safe space to ease anxiety and find inner calm.',
      phases: [
        {
          title: 'Acknowledgment',
          guidance: 'Notice any anxious feelings without trying to change them. They are here, and that\'s okay. You are safe in this moment.',
          breathingPattern: 'Gentle, natural breaths',
        },
        {
          title: 'Grounding',
          guidance: 'Feel the weight of your body. Notice five things you can sense right now—sounds, sensations, the air on your skin. You are here, in this moment, and you are safe.',
          breathingPattern: 'Inhale for 4, hold for 4, exhale for 6',
        },
        {
          title: 'Compassionate Presence',
          guidance: 'Place your hand on your heart. Speak kindly to yourself: "I am doing my best. This feeling will pass. I am stronger than I know."',
        },
        {
          title: 'Creating Space',
          guidance: 'Imagine your worries as clouds in the sky. Observe them drifting past. They are not you—they are simply passing through.',
          breathingPattern: 'Long, slow exhales',
        },
        {
          title: 'Peace',
          guidance: 'With each breath, feel a sense of peace growing within you. You have everything you need in this moment. You are enough.',
        },
      ],
    },
  };

  const content = purposeContent[purpose];
  
  // Adjust number of phases based on duration
  let phases = content.phases;
  if (duration <= 5) {
    phases = content.phases.slice(0, 3);
  } else if (duration <= 10) {
    phases = content.phases.slice(0, 4);
  }

  return {
    introduction: `${postureIntros[posture]} ${content.intro}`,
    phases,
    closing: 'Take a moment to notice how you feel. Thank yourself for taking this time. Carry this sense of peace with you.',
  };
}
