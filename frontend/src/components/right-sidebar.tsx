import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface RightSidebarProps {
    width: number
}

export default function RightSidebar(width: RightSidebarProps) {
    return (
        <div className="border-l border-zinc-800 flex flex-col overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>Item 1</AccordionTrigger>
                    <AccordionContent>Content 1</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Item 2</AccordionTrigger>
                    <AccordionContent>Content 2</AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
