import { Search } from "lucide-react"

import { Label } from "../../../components/ui/label"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarInput,
} from "../../../components/ui/sidebar"

type SearchFormProps = React.ComponentProps<"form"> & {
    placeholder?: string
    query?: string
    onQueryChange?: (query: string) => void
}

export function SearchForm({ placeholder = "Search...", query, onQueryChange, ...props }: SearchFormProps) {
    return (
        <form {...props} onSubmit={(event) => event.preventDefault()}>
            <SidebarGroup className="py-0">
                <SidebarGroupContent className="relative">
                    <Label htmlFor="search" className="sr-only">
                        Search
                    </Label>
                    <SidebarInput
                        id="search"
                        value={query}
                        onChange={(event) => onQueryChange?.(event.target.value)}
                        placeholder={placeholder}
                        className="pl-8"
                    />
                    <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
                </SidebarGroupContent>
            </SidebarGroup>
        </form>
    )
}
