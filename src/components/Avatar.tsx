import { ATHLETES_BY_ID } from '../data/athletes';
import { usePhoto } from '../photos';

// Photo de profil d'un joueur : la photo d'un animal de sa collection, dans un rond.
// Sans animal choisi (ou sans photo), l'initiale du pseudo.

interface AvatarProps {
  athleteId?: string;
  pseudo?: string;
  className?: string;
}

export function Avatar({ athleteId, pseudo, className = '' }: AvatarProps) {
  const athlete = athleteId ? ATHLETES_BY_ID[athleteId] : undefined;
  return athlete ? <PhotoAvatar athleteId={athlete.id} pseudo={pseudo} className={className} /> : <Initial pseudo={pseudo} className={className} />;
}

function PhotoAvatar({ athleteId, pseudo, className }: { athleteId: string; pseudo?: string; className: string }) {
  const photo = usePhoto(ATHLETES_BY_ID[athleteId]);
  if (!photo.src) return <Initial pseudo={pseudo} className={className} />;
  return (
    <span className={`avatar ${className}`}>
      <img src={photo.src} alt="" draggable={false} />
    </span>
  );
}

function Initial({ pseudo, className }: { pseudo?: string; className: string }) {
  return (
    <span className={`avatar avatar--initial ${className}`}>
      {pseudo ? (
        pseudo.charAt(0).toUpperCase()
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx={12} cy={8.5} r={3.6} />
          <path d="M5,20 C6,15.5 9,14 12,14 C15,14 18,15.5 19,20" />
        </svg>
      )}
    </span>
  );
}
