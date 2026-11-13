import Invitation from "@/components/Invitation";
import { loadGuest } from "@/lib/guest";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Invitación pública. Acepta ?invitado=CODIGO para la versión personalizada. */
export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const { guest, invalidCode } = await loadGuest(params.invitado);
  return <Invitation guest={guest} invalidCode={invalidCode} />;
}
