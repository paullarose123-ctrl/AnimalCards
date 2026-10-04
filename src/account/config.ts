// Les deux codes du projet Supabase qui garde les comptes et les sauvegardes (Project Settings → API Keys).
// La clé publique (« anon » ou « publishable ») peut être publiée sans risque : les règles de sécurité de la base
// (supabase/schema.sql) ne laissent chaque joueur lire et modifier que sa propre sauvegarde.
// Ne jamais mettre ici la clé « service_role » ou « secret ».
// Tant que ces codes sont vides, le jeu se joue en invité et l'écran Profil annonce les comptes pour bientôt.

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';

/**
 * Supabase demande une adresse e-mail : le pseudo devient une adresse fictive (pseudo@ce-domaine), qui ne reçoit
 * jamais de courrier puisque la confirmation par e-mail est coupée dans le projet.
 */
export const PSEUDO_EMAIL_DOMAIN = 'joueurs.animalcards.app';
