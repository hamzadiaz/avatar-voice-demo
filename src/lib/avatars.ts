export interface AvatarOption {
  id: string
  name: string
  gender: "male" | "female"
  url: string
  body: "M" | "F"
  description: string
  source: string
}

export const AVATARS: AvatarOption[] = [
  {
    id: "brunette",
    name: "Julia",
    gender: "female",
    url: "/avatars-3d/female.glb",
    body: "F",
    description: "Brunette with casual style",
    source: "Ready Player Me",
  },
  {
    id: "avatarsdk",
    name: "Michael",
    gender: "male",
    url: "/avatars-3d/male.glb",
    body: "M",
    description: "Professional look",
    source: "AvatarSDK",
  },
  {
    id: "avaturn",
    name: "Harri",
    gender: "male",
    url: "/avatars-3d/avaturn.glb",
    body: "M",
    description: "Casual with glasses",
    source: "Avaturn",
  },
]

export const DEFAULT_AVATAR_ID = "brunette"

export function getAvatar(id: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}
