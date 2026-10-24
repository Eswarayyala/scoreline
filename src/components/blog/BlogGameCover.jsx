import { bannerForGame } from "../../data/platformShowcase";
import { useGameLibraryAvatar } from "../../hooks/useMediaLibrary";

/** Wide blog cover from the game's media-library avatar / poster pack. */
export default function BlogGameCover({
  game,
  coverUrl = "",
  height = 160,
  className = "",
  style,
}) {
  const library = useGameLibraryAvatar(game, coverUrl || "");
  const src = library || bannerForGame(game);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={className}
      style={{
        width: "100%",
        height,
        objectFit: "cover",
        borderRadius: 10,
        marginTop: 8,
        ...style,
      }}
    />
  );
}
