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
    id: "julia-black",
    name: "Julia",
    gender: "female",
    url: "/avatars-3d/female_black.glb",
    body: "F",
    description: "Black AgentJara tee",
    source: "AgentJara",
  },
  {
    id: "julia-white",
    name: "Julia",
    gender: "female",
    url: "/avatars-3d/female_white.glb",
    body: "F",
    description: "White AgentJara tee",
    source: "AgentJara",
  },
  {
    id: "brunette",
    name: "Julia (Original)",
    gender: "female",
    url: "/avatars-3d/female.glb",
    body: "F",
    description: "Brunette with casual style",
    source: "Ready Player Me",
  },
  {
    id: "michael-black",
    name: "Michael",
    gender: "male",
    url: "/avatars-3d/male_black.glb",
    body: "M",
    description: "Black AgentJara tee",
    source: "AgentJara",
  },
  {
    id: "michael-white",
    name: "Michael",
    gender: "male",
    url: "/avatars-3d/male_white.glb",
    body: "M",
    description: "White AgentJara tee",
    source: "AgentJara",
  },
  {
    id: "avatarsdk",
    name: "Michael (Original)",
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

export const DEFAULT_AVATAR_ID = "julia-black"

export function getAvatar(id: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]
}
